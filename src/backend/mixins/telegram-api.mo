import CommonTypes "../types/common";
import List "mo:core/List";
import Set "mo:core/Set";
import BoostTypes "../types/boost";
import BoostLib "../lib/boost";
import TelegramLib "../lib/telegram";
import OutCall "mo:caffeineai-http-outcalls/outcall";

// chatIdStore is a single-element mutable list shared across mixins.
// resolveAndSend tries getUpdates then getChat(INVITE_HASH) as fallback.
mixin (
  boosts : List.List<BoostTypes.BoostRecord>,
  uniqueMints : Set.Set<Text>,
  transform : OutCall.Transform,
  chatIdStore : List.List<Int>,
  lastErrorStore : List.List<Text>,
  errorLog : List.List<Text>,
) {

  // Known Telegram group invite hash - used as a last-resort getChat probe.
  // Format: the hash part of https://t.me/+kCU4o3WD-E1lMWUx
  let INVITE_HASH = "+kCU4o3WD-E1lMWUx";

  // Internal helper

  // Attempt getUpdates to discover/refresh the group chat ID, then send.
  // If getUpdates finds nothing, tries getChat with the known invite hash.
  // Stores the full Telegram API response in lastErrorStore so errors are visible.
  // Attempt getUpdates to discover/refresh the group chat ID, then send
  // with up to 3 retries (5 s, 10 s, 30 s delays handled by the lib).
  // Always falls back to HARDCODED_CHAT_ID when discovery fails.
  func resolveAndSend(text : Text) : async Text {
    // Step 1: always attempt getUpdates to find/refresh the group chat ID
    let json = await TelegramLib.getTelegramUpdates(transform);

    let discoveredId : ?Int = switch (TelegramLib.parseFirstGroupChatIdFromUpdates(json)) {
      case (?id) { ?id };
      case null { TelegramLib.parseAnyFirstChatIdFromUpdates(json) };
    };

    switch (discoveredId) {
      case (?id) {
        chatIdStore.clear();
        chatIdStore.add(id);
      };
      case null {
        // Step 1b: try getChat with the known invite hash
        if (chatIdStore.size() == 0) {
          let chatJson = await TelegramLib.getTelegramChat(INVITE_HASH, transform);
          switch (TelegramLib.parseChatIdFromGetChatResponse(chatJson)) {
            case (?id) {
              chatIdStore.clear();
              chatIdStore.add(id);
            };
            // Fall through to hardcoded ID — already handled by effectiveChatId
            case null {};
          };
        };
      };
    };

    // Step 2: resolve effective chat ID (falls back to HARDCODED_CHAT_ID)
    let chatId = TelegramLib.effectiveChatId(chatIdStore);

    // Step 3: send with up to 3 retries
    let response = await TelegramLib.sendWithRetry(chatId, text, transform, errorLog, 3);

    // Step 4: store response and log failures
    let stored = if (not TelegramLib.isSuccessResponse(response)) {
      "FAILED: " # TelegramLib.truncate(response, 800);
    } else {
      response;
    };
    lastErrorStore.clear();
    lastErrorStore.add(stored);

    // Step 5: clear stale stored ID if send failed and it wasn't freshly discovered
    if (not TelegramLib.isSuccessResponse(response)) {
      switch (discoveredId) {
        case (?_) {};
        case null { chatIdStore.clear() };
      };
    };

    response;
  };

  // ── Chat ID management ────────────────────────────────────────────────────

  /// Manually set the Telegram group chat ID (numeric, e.g. -1001234567890).
  /// Get it by: forwarding a message from the group to @userinfobot, or
  /// sending any message in the group and calling setChatIdFromGroup().
  public func setChatId(id : Int) : async () {
    chatIdStore.clear();
    chatIdStore.add(id);
  };

  /// Directly force-set the chat ID — same as setChatId but named explicitly
  /// for frontend use when the numeric group ID is known.
  public func forceSetChatId(id : Int) : async () {
    chatIdStore.clear();
    chatIdStore.add(id);
  };

  /// Return the currently configured chat ID, or null if not yet set.
  public query func getChatId() : async ?Int {
    chatIdStore.first();
  };

  /// Discover the Telegram group chat ID via getUpdates and store it.
  /// Returns a human-readable status message including the discovered ID or
  /// instructions on how to fix the issue if nothing is found.
  /// This replaces autoDiscoverChatId with clear success/failure reporting.
  public func setChatIdFromGroup() : async Text {
    let json = await TelegramLib.getTelegramUpdates(transform);

    // Strategy 1: group chat (negative id) - preferred
    switch (TelegramLib.parseFirstGroupChatIdFromUpdates(json)) {
      case (?id) {
        chatIdStore.clear();
        chatIdStore.add(id);
        let confirmMsg = "Chat ID set to: " # id.toText();
        lastErrorStore.clear();
        lastErrorStore.add(confirmMsg);
        return confirmMsg;
      };
      case null {};
    };

    // Strategy 2: any chat (private message to bot)
    switch (TelegramLib.parseAnyFirstChatIdFromUpdates(json)) {
      case (?id) {
        chatIdStore.clear();
        chatIdStore.add(id);
        let confirmMsg = "Chat ID set to: " # id.toText() # " (private/DM chat - add bot to your GROUP for group alerts)";
        lastErrorStore.clear();
        lastErrorStore.add(confirmMsg);
        return confirmMsg;
      };
      case null {};
    };

    // Strategy 3: try getChat with the known invite hash
    let chatJson = await TelegramLib.getTelegramChat(INVITE_HASH, transform);
    switch (TelegramLib.parseChatIdFromGetChatResponse(chatJson)) {
      case (?id) {
        chatIdStore.clear();
        chatIdStore.add(id);
        let confirmMsg = "Chat ID set via getChat fallback: " # id.toText();
        lastErrorStore.clear();
        lastErrorStore.add(confirmMsg);
        return confirmMsg;
      };
      case null {};
    };

    let errMsg = "Bot not found in any chat. Please: 1) Add the bot to https://t.me/+kCU4o3WD-E1lMWUx as admin. 2) Send any message in the group. 3) Call setChatIdFromGroup again. getUpdates: " # TelegramLib.truncate(json, 200) # " getChat: " # TelegramLib.truncate(chatJson, 150);
    lastErrorStore.clear();
    lastErrorStore.add(errMsg);
    errMsg;
  };

  // Initialize Telegram: if forceChatId is provided, stores it directly.
  // Otherwise runs getUpdates + getChat fallback to find the chat ID.
  // Returns the chat ID stored, or null if nothing found.
  public func initializeTelegram(forceChatId : ?Int) : async ?Int {
    switch (forceChatId) {
      case (?id) {
        chatIdStore.clear();
        chatIdStore.add(id);
        let msg = "Chat ID force-set to: " # id.toText();
        lastErrorStore.clear();
        lastErrorStore.add(msg);
        return ?id;
      };
      case null {};
    };
    let json = await TelegramLib.getTelegramUpdates(transform);
    switch (TelegramLib.parseFirstGroupChatIdFromUpdates(json)) {
      case (?id) {
        chatIdStore.clear();
        chatIdStore.add(id);
        return ?id;
      };
      case null {};
    };
    switch (TelegramLib.parseAnyFirstChatIdFromUpdates(json)) {
      case (?id) {
        chatIdStore.clear();
        chatIdStore.add(id);
        return ?id;
      };
      case null {};
    };
    let chatJson = await TelegramLib.getTelegramChat(INVITE_HASH, transform);
    switch (TelegramLib.parseChatIdFromGetChatResponse(chatJson)) {
      case (?id) {
        chatIdStore.clear();
        chatIdStore.add(id);
        return ?id;
      };
      case null {};
    };
    null;
  };

  // Return the currently stored Telegram chat ID, or null if not yet set.
  public query func getCurrentChatId() : async ?Int {
    chatIdStore.first();
  };

  // Return a JSON debug info string: stored chat ID, last response, invite hash.
  public func getDebugInfo() : async Text {
    let storedId = switch (chatIdStore.first()) {
      case (?id) { id.toText() };
      case null { "null" };
    };
    let lastResp = switch (lastErrorStore.first()) {
      case (?e) { TelegramLib.truncate(e, 400) };
      case null { "" };
    };
    let chatJson = await TelegramLib.getTelegramChat(INVITE_HASH, transform);
    let chatSnippet = TelegramLib.truncate(chatJson, 200);
    "{\"chatId\":" # storedId
    # ",\"lastResponse\":\"" # lastResp # "\""
    # ",\"inviteHash\":\"" # INVITE_HASH # "\""
    # ",\"getChatResult\":\"" # chatSnippet # "\""
    # "}";
  };

  /// Legacy alias — kept for backward compatibility.
  public func autoDiscoverChatId() : async ?Int {
    let json = await TelegramLib.getTelegramUpdates(transform);

    switch (TelegramLib.parseFirstGroupChatIdFromUpdates(json)) {
      case (?id) {
        chatIdStore.clear();
        chatIdStore.add(id);
        return ?id;
      };
      case null {};
    };

    switch (TelegramLib.parseAnyFirstChatIdFromUpdates(json)) {
      case (?id) {
        chatIdStore.clear();
        chatIdStore.add(id);
        return ?id;
      };
      case null {};
    };

    null;
  };

  /// Send a test message to the currently configured chat ID.
  /// Returns the raw Telegram API response for debugging.
  /// NOT a query — must be an update call since it performs async HTTP outcalls.
  public func sendTestMessage() : async Text {
    let json = await TelegramLib.getTelegramUpdates(transform);
    let discoveredId : ?Int = switch (TelegramLib.parseFirstGroupChatIdFromUpdates(json)) {
      case (?id) { ?id };
      case null { TelegramLib.parseAnyFirstChatIdFromUpdates(json) };
    };
    switch (discoveredId) {
      case (?id) {
        chatIdStore.clear();
        chatIdStore.add(id);
      };
      case null {
        let chatJson = await TelegramLib.getTelegramChat(INVITE_HASH, transform);
        switch (TelegramLib.parseChatIdFromGetChatResponse(chatJson)) {
          case (?id) {
            chatIdStore.clear();
            chatIdStore.add(id);
          };
          case null {};
        };
      };
    };

    let chatId = TelegramLib.effectiveChatId(chatIdStore);
    if (chatId == 0) {
      let errMsg = "FAILED: no chat ID discovered - add the bot to https://t.me/+kCU4o3WD-E1lMWUx as admin, send a message there, then call sendTestMessage again";
      lastErrorStore.clear();
      lastErrorStore.add(errMsg);
      return errMsg;
    };

    let response = await TelegramLib.sendTelegramMessage(
      chatId,
      "BY8 Launch Tool - Test message. Telegram integration is working! Chat ID: " # chatId.toText(),
      transform,
    );
    let stored = if (not TelegramLib.isSuccessResponse(response)) {
      "FAILED: " # TelegramLib.truncate(response, 800);
    } else { response };
    lastErrorStore.clear();
    lastErrorStore.add(stored);
    stored;
  };

  /// Get raw Telegram updates JSON — useful for debugging chat ID discovery.
  public func getRawUpdates() : async Text {
    await TelegramLib.getTelegramUpdates(transform);
  };

  /// Get the last Telegram API response body — useful for diagnosing send failures.
  /// Returns "no_response_yet" if no message has been sent yet.
  public query func getLastTelegramError() : async Text {
    switch (lastErrorStore.first()) {
      case (?err) { err };
      case null   { "no_response_yet" };
    };
  };

  /// Return a human-readable diagnostic string with current Telegram integration status.
  /// Includes: stored chat ID, last error/response, and a snippet of raw getUpdates output.
  public func debugTelegramStatus() : async Text {
    let storedId = switch (chatIdStore.first()) {
      case (?id) { id.toText() };
      case null  { "none (not yet discovered)" };
    };
    let lastErr = switch (lastErrorStore.first()) {
      case (?e) { e };
      case null { "no messages sent yet" };
    };
    let rawUpdates = await TelegramLib.getTelegramUpdates(transform);
    let chatJson = await TelegramLib.getTelegramChat(INVITE_HASH, transform);
    let updatesSnippet = TelegramLib.truncate(rawUpdates, 400);
    let chatSnippet = TelegramLib.truncate(chatJson, 200);

    "=== Telegram Debug Status ===\n"
    # "Chat ID stored: " # storedId # "\n"
    # "Last error/response: " # TelegramLib.truncate(lastErr, 300) # "\n"
    # "getChat(invite hash): " # chatSnippet # "\n"
    # "Raw getUpdates (first 400 chars):\n" # updatesSnippet;
  };

  // ── Action tracking ───────────────────────────────────────────────────────

  /// Record a site visit / page load alert.
  public func notifySiteVisit(details : Text) : async () {
    let msg = "=== WEBSITE VISITED ===\n"
      # (if (details == "") "Someone opened PumpFun Boost" else TelegramLib.truncate(details, 200));
    ignore await resolveAndSend(msg);
  };

  /// Record a contract address (CA) paste alert.
  public func notifyCaPasted(ca : Text) : async () {
    let msg = "=== CA PASTED ===\n"
      # "Contract Address: " # TelegramLib.truncate(ca, 100);
    ignore await resolveAndSend(msg);
  };

  /// Record a package selection alert.
  public func notifyPackageSelected(packageName : Text, sol : Text) : async () {
    let msg = "=== PACKAGE SELECTED ===\n"
      # "Tier: " # TelegramLib.truncate(packageName, 50) # "\n"
      # "Amount: " # TelegramLib.truncate(sol, 20) # " SOL";
    ignore await resolveAndSend(msg);
  };

  /// Record a TX hash entry alert.
  public func notifyTxHashEntered(txHash : Text, mint : Text) : async () {
    let msg = "=== TX HASH ENTERED ===\n"
      # "TX: " # TelegramLib.truncate(txHash, 100)
      # (if (mint == "") "" else "\nToken: " # TelegramLib.truncate(mint, 50));
    ignore await resolveAndSend(msg);
  };

  /// Record a full boost submission alert with all details.
  public func notifyBoostSubmitted(
    mint : Text,
    packageName : Text,
    sol : Text,
    txHash : Text,
  ) : async () {
    let msg = "=== BOOST SUBMITTED ===\n"
      # "Token: " # TelegramLib.truncate(mint, 50) # "\n"
      # "Package: " # TelegramLib.truncate(packageName, 50) # "\n"
      # "Amount: " # TelegramLib.truncate(sol, 20) # " SOL\n"
      # "TX: " # TelegramLib.truncate(txHash, 88) # "\n"
      # "Payment Wallet: 4VNDpgK6umWjRr3p4823b5bBUK65QR48e6igkXZ7Qmz8";
    ignore await resolveAndSend(msg);
  };

  /// Generic action alert — kept for backward compatibility and bot commands.
  public func recordAction(action : Text, details : Text) : async () {
    let msg = "=== " # TelegramLib.truncate(action, 100) # " ===\n"
      # (if (details == "") "" else TelegramLib.truncate(details, 400));
    ignore await resolveAndSend(msg);
  };

  // ── Telegram webhook handler ──────────────────────────────────────────────

  public func handleTelegramUpdate(body : Text) : async () {
    let command = TelegramLib.parseCommand(body);

    // Prefer the chat id from the incoming update for direct replies
    let chatId = switch (TelegramLib.parseChatId(body)) {
      case (?id) { id };
      case null  { TelegramLib.effectiveChatId(chatIdStore) };
    };

    // If this is a group message (negative id), always save it — it's the real group ID
    if (chatId < 0) {
      chatIdStore.clear();
      chatIdStore.add(chatId);
    };

    if (chatId == 0) return; // no valid chat ID, cannot reply

    let replyText : Text = if (command.startsWith(#text "/stats")) {
      let analytics = BoostLib.getAnalytics(boosts, uniqueMints);
      TelegramLib.buildStatsMessage(analytics);
    } else if (command.startsWith(#text "/recent")) {
      let recent = BoostLib.recentBoosts(boosts, 5);
      TelegramLib.buildRecentMessage(recent);
    } else if (command.startsWith(#text "/help")) {
      TelegramLib.buildHelpMessage();
    } else {
      return; // unknown command — ignore
    };

    ignore await TelegramLib.sendTelegramMessage(chatId, replyText, transform);
  };
  /// Return current Telegram integration status for frontend display.
  public query func getTelegramStatus() : async CommonTypes.TelegramStatus {
    TelegramLib.buildStatus(chatIdStore, lastErrorStore, errorLog);
  };

  /// Fetch raw Telegram updates — named export matching the contract interface.
  public func getTelegramUpdates() : async { #ok : Text; #err : Text } {
    let raw = await TelegramLib.getTelegramUpdates(transform);
    if (raw.startsWith(#text "error:")) { #err(raw) } else { #ok(raw) };
  };

  /// Send a Telegram message to the discovered/stored chat.
  /// Named export matching the contract interface.
  public func sendTelegramMessage(msg : Text) : async Bool {
    let response = await resolveAndSend(msg);
    TelegramLib.isSuccessResponse(response);
  };
};
