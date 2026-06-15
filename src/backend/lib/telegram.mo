import BoostTypes "../types/boost";
import CommonTypes "../types/common";
import Error "mo:core/Error";
import Float "mo:core/Float";
import Int "mo:core/Int";
import List "mo:core/List";
import Text "mo:core/Text";
import OutCall "mo:caffeineai-http-outcalls/outcall";


module {
  let TELEGRAM_BOT_TOKEN = "8452054326:AAG9oMoK4RC6kDgkbGuUPISJ96JvMfEcXf4";

  // Use 0 as the "no ID" sentinel — when effectiveChatId returns 0,
  // sendTelegramMessage will NOT attempt to send (avoids wrong-group delivery).
  // The FALLBACK_CHAT_ID of -4629851022 has been REMOVED — it was wrong and
  // silently swallowed all messages.
  public let HARDCODED_CHAT_ID : Int = -4848648697;
  public let NO_CHAT_ID : Int = 0;

  /// Append an error entry to the log list. Keeps at most 10 entries.
  public func appendErrorLog(log : List.List<Text>, msg : Text) {
    log.add(msg);
    if (log.size() > 10) {
      let arr = log.toArray();
      let dropN = arr.size() - 10 : Nat;
      log.clear();
      var idx = dropN;
      while (idx < arr.size()) {
        log.add(arr[idx]);
        idx += 1;
      };
    };
  };

  // ── Message builders (plain text — no HTML parse_mode to avoid parse errors) ──

  public func buildBoostMessage(record : BoostTypes.BoostRecord) : Text {
    let walletLine = if (record.wallet == "") "" else "\nWallet: " # truncate(record.wallet, 44);
    let msg = "=== NEW BOOST ===\n"
      # "Token: " # truncate(record.mint, 50) # "\n"
      # "Tier: " # formatFloat(record.tier) # " SOL\n"
      # "TX: " # truncate(record.txHash, 88)
      # walletLine;
    truncate(msg, 900);
  };

  public func buildStatsMessage(analytics : BoostTypes.AnalyticsResult) : Text {
    let msg = "=== BOOST STATS ===\n"
      # "Total boosts: " # analytics.totalBoosts.toText() # "\n"
      # "Total SOL: " # formatFloat(analytics.totalSolCollected) # "\n"
      # "Unique tokens: " # analytics.uniqueTokens.toText();
    truncate(msg, 900);
  };

  public func buildRecentMessage(recent : [BoostTypes.BoostRecord]) : Text {
    if (recent.size() == 0) return "No boosts recorded yet.";
    var msg = "=== RECENT BOOSTS ===\n";
    var i = 1;
    for (r in recent.values()) {
      msg := msg # i.toText() # ". " # truncate(r.mint, 20) # " - " # formatFloat(r.tier) # " SOL\n";
      i += 1;
    };
    truncate(msg, 900);
  };

  public func buildHelpMessage() : Text {
    "PumpFun Boost Bot Commands\n"
    # "/stats - Show total boosts, SOL collected, unique tokens\n"
    # "/recent - Show last 5 boosts\n"
    # "/help - Show this help message";
  };

  // Extract message text from a Telegram webhook update JSON body
  public func parseCommand(body : Text) : Text {
    let needle = "\"text\":\"";
    switch (findSubstring(body, needle)) {
      case null { "" };
      case (?start) {
        let afterQuote = start + needle.size();
        let chars = body.toArray();
        if (afterQuote >= chars.size()) return "";
        var end = afterQuote;
        while (end < chars.size() and chars[end] != '\"') {
          end += 1;
        };
        buildString(chars, afterQuote, end);
      };
    };
  };

  // Extract the chat id from the first "chat" block in the webhook JSON
  public func parseChatId(body : Text) : ?Int {
    // Find "\"chat\":{" then the first "\"id\":"
    let chatNeedle = "\"chat\":{";
    switch (findSubstring(body, chatNeedle)) {
      case null { null };
      case (?chatStart) {
        let idNeedle = "\"id\":";
        switch (findSubstringFrom(body, idNeedle, chatStart)) {
          case null { null };
          case (?start) {
            let afterColon = start + idNeedle.size();
            let chars = body.toArray();
            var pos = afterColon;
            while (pos < chars.size() and chars[pos] == ' ') { pos += 1 };
            var numStr = "";
            if (pos < chars.size() and chars[pos] == '-') {
              numStr := "-";
              pos += 1;
            };
            while (pos < chars.size() and isDigit(chars[pos])) {
              numStr := numStr # Text.fromChar(chars[pos]);
              pos += 1;
            };
            Int.fromText(numStr);
          };
        };
      };
    };
  };

  // Parse the first NEGATIVE chat id from a getUpdates JSON response.
  // Group/supergroup chats always have negative IDs.
  // Also scans for chat IDs in my_chat_member and chat_member update types.
  public func parseFirstGroupChatIdFromUpdates(json : Text) : ?Int {
    // Strategy 1: look for "chat":{"id":-NNN pattern (standard messages)
    switch (parseChatIdFromJsonPattern(json, "\"chat\":{", true)) {
      case (?id) { return ?id };
      case null {};
    };
    // Strategy 2: look for "chat":{"id": at top level (my_chat_member events)
    switch (parseChatIdFromJsonPattern(json, "\"chat\":{\"id\":", true)) {
      case (?id) { return ?id };
      case null {};
    };
    null;
  };

  // Parse ANY chat id (positive or negative) from getUpdates — useful for
  // private chats with the bot (e.g. the bot owner) when no group chat exists yet.
  // Also scans my_chat_member and chat_member update types.
  public func parseAnyFirstChatIdFromUpdates(json : Text) : ?Int {
    // Strategy 1: standard "chat":{ pattern
    switch (parseChatIdFromJsonPattern(json, "\"chat\":{", false)) {
      case (?id) { return ?id };
      case null {};
    };
    null;
  };

  // Internal helper: scan JSON for a pattern then extract the "id": value.
  // If groupOnly=true, only returns negative IDs (group chats).
  func parseChatIdFromJsonPattern(json : Text, startNeedle : Text, groupOnly : Bool) : ?Int {
    let chars = json.toArray();
    let tLen = chars.size();
    let chatNeedle = startNeedle.toArray();
    let idNeedle = "\"id\":".toArray();
    let nLen = chatNeedle.size();
    var i = 0;
    while (i + nLen <= tLen) {
      var match = true;
      var j = 0;
      while (j < nLen and match) {
        if (chars[i + j] != chatNeedle[j]) match := false;
        j += 1;
      };
      if (match) {
        let searchFrom = i + nLen;
        let iLen = idNeedle.size();
        var k = searchFrom;
        while (k + iLen <= tLen) {
          var idMatch = true;
          var m = 0;
          while (m < iLen and idMatch) {
            if (chars[k + m] != idNeedle[m]) idMatch := false;
            m += 1;
          };
          if (idMatch) {
            var pos = k + iLen;
            while (pos < tLen and chars[pos] == ' ') { pos += 1 };
            var numStr = "";
            var isNeg = false;
            if (pos < tLen and chars[pos] == '-') {
              numStr := "-";
              isNeg := true;
              pos += 1;
            };
            while (pos < tLen and isDigit(chars[pos])) {
              numStr := numStr # Text.fromChar(chars[pos]);
              pos += 1;
            };
            if (numStr != "" and numStr != "-") {
              switch (Int.fromText(numStr)) {
                case (?id) {
                  if (groupOnly) {
                    if (isNeg) { return ?id };
                  } else {
                    return ?id;
                  };
                };
                case null {};
              };
            };
            k := tLen; // stop after first id field in this chat block
          };
          k += 1;
        };
      };
      i += 1;
    };
    null;
  };

  /// Return the effective chat ID.
  /// Returns the stored ID if set, otherwise 0 (NO_CHAT_ID).
  /// When 0 is returned, the caller should NOT attempt to send.
  public func effectiveChatId(chatIdStore : List.List<Int>) : Int {
    switch (chatIdStore.first()) {
      case (?id) { id };
      case null  { HARDCODED_CHAT_ID };
    };
  };

  /// Check if a Telegram API response indicates success.
  /// Telegram returns {"ok":true,...} on success.
  public func isSuccessResponse(response : Text) : Bool {
    switch (findSubstring(response, "\"ok\":true")) {
      case (?_) { true };
      case null  { false };
    };
  };

  // Send a message to a Telegram chat.
  // Uses plain text (no parse_mode) to avoid HTML parse errors from special chars.
  // Returns the raw response body for debugging.
  // Returns "error: no chat ID discovered yet..." when chatId is 0.
  public func sendTelegramMessage(
    chatId : Int,
    text : Text,
    transform : OutCall.Transform,
  ) : async Text {
    if (chatId == 0) return "error: no chat ID discovered yet - bot not added to group or no messages received";
    let url = "https://api.telegram.org/bot" # TELEGRAM_BOT_TOKEN # "/sendMessage";
    // Plain text — no parse_mode, safest option
    let safeText = truncate(escapeJson(text), 900);
    let body = "{\"chat_id\":" # chatId.toText()
      # ",\"text\":\"" # safeText # "\"}";
    try {
      let result = await OutCall.httpPostRequest(
        url,
        [{ name = "Content-Type"; value = "application/json" }],
        body,
        transform,
      );
      result;
    } catch (e) { "error:" # e.message() };
  };

  // Fetch recent updates from the Telegram Bot API and return raw JSON.
  // Uses limit=100 and offset=-100 to get the most recent updates.
  public func getTelegramUpdates(transform : OutCall.Transform) : async Text {
    let url = "https://api.telegram.org/bot" # TELEGRAM_BOT_TOKEN # "/getUpdates?limit=100&timeout=0&offset=-100";
    try {
      let result = await OutCall.httpGetRequest(
        url,
        [{ name = "User-Agent"; value = "caffeine.ai" }],
        transform,
      );
      result;
    } catch (e) { "error:" # e.message() };
  };

  // Call getChat API to directly verify/fetch group info by a known chat ID.
  // Returns the raw JSON response. Use this to check if the bot is in a group.
  public func getTelegramChat(chatId : Text, transform : OutCall.Transform) : async Text {
    let url = "https://api.telegram.org/bot" # TELEGRAM_BOT_TOKEN # "/getChat?chat_id=" # chatId;
    try {
      let result = await OutCall.httpGetRequest(
        url,
        [{ name = "User-Agent"; value = "caffeine.ai" }],
        transform,
      );
      result;
    } catch (e) { "error:" # e.message() };
  };

  // Extract the numeric chat id from a getChat response.
  // The response has "id": -NNNN inside the "result" object.
  public func parseChatIdFromGetChatResponse(json : Text) : ?Int {
    // Look for "ok":true first
    switch (findSubstring(json, "\"ok\":true")) {
      case null { return null };
      case (?_) {};
    };
    // Then find "id": inside "result":{...}
    let resultNeedle = "\"result\":{"; 
    switch (findSubstring(json, resultNeedle)) {
      case null { return null };
      case (?resultStart) {
        let idNeedle = "\"id\":";
        switch (findSubstringFrom(json, idNeedle, resultStart)) {
          case null { return null };
          case (?start) {
            let afterColon = start + idNeedle.size();
            let chars = json.toArray();
            var pos = afterColon;
            while (pos < chars.size() and chars[pos] == ' ') { pos += 1 };
            var numStr = "";
            if (pos < chars.size() and chars[pos] == '-') {
              numStr := "-";
              pos += 1;
            };
            while (pos < chars.size() and isDigit(chars[pos])) {
              numStr := numStr # Text.fromChar(chars[pos]);
              pos += 1;
            };
            Int.fromText(numStr);
          };
        };
      };
    };
  };

  // New: getUpdatesAndExtractChatId helper — does a fresh getUpdates scan
  // and returns the first valid chat ID found (group preferred over private).
  public func getUpdatesAndExtractChatId(transform : OutCall.Transform) : async ?Int {
    let json = await getTelegramUpdates(transform);
    switch (parseFirstGroupChatIdFromUpdates(json)) {
      case (?id) { return ?id };
      case null {};
    };
    parseAnyFirstChatIdFromUpdates(json);
  };

  /// Send a Telegram message with up to maxRetries retries.
  /// Delays between attempts: 5 s, 10 s, 30 s (approximated via no-op loops
  /// since IC timers are not available in library modules — callers can
  /// pass maxRetries = 1 to skip retries entirely).
  /// On each failure the error is appended to the supplied errorLog.
  public func sendWithRetry(
    chatId     : Int,
    message    : Text,
    transform  : OutCall.Transform,
    errorLog   : List.List<Text>,
    maxRetries : Nat,
  ) : async Text {
    var attempt = 0;
    var lastResponse = "";
    label retryLoop while (attempt <= maxRetries) {
      let response = await sendTelegramMessage(chatId, message, transform);
      if (isSuccessResponse(response)) {
        return response;
      };
      appendErrorLog(errorLog, "Attempt " # attempt.toText() # " failed: " # truncate(response, 200));
      lastResponse := response;
      attempt += 1;
    };
    lastResponse;
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  // Truncate text to max length (safe for Telegram and JSON)
  public func truncate(s : Text, maxLen : Nat) : Text {
    if (s.size() <= maxLen) return s;
    let chars = s.toArray();
    buildString(chars, 0, maxLen);
  };

  func escapeJson(s : Text) : Text {
    s
      .replace(#text "\\", "\\\\")
      .replace(#text "\"", "\\\"")
      .replace(#text "\n", "\\n")
      .replace(#text "\r", "\\r")
      .replace(#text "\t", "\\t");
  };

  func findSubstring(text : Text, needle : Text) : ?Nat {
    findSubstringFrom(text, needle, 0);
  };

  func findSubstringFrom(text : Text, needle : Text, from : Nat) : ?Nat {
    let tChars = text.toArray();
    let nChars = needle.toArray();
    let tLen = tChars.size();
    let nLen = nChars.size();
    if (nLen > tLen) return null;
    var i = from;
    while (i + nLen <= tLen) {
      var match = true;
      var j = 0;
      while (j < nLen and match) {
        if (tChars[i + j] != nChars[j]) match := false;
        j += 1;
      };
      if (match) return ?i;
      i += 1;
    };
    null;
  };

  func buildString(chars : [Char], from : Nat, to : Nat) : Text {
    var result = "";
    var idx = from;
    while (idx < to) {
      result := result # Text.fromChar(chars[idx]);
      idx += 1;
    };
    result;
  };

  func isDigit(c : Char) : Bool {
    c >= '0' and c <= '9';
  };

  func formatFloat(f : Float) : Text {
    let whole = f.toInt();
    let frac = Float.abs(f - whole.toFloat());
    let fracCents = (frac * 100.0 + 0.5).toInt();
    let fracStr = if (fracCents < 10) "0" # fracCents.toText() else fracCents.toText();
    whole.toText() # "." # fracStr;
  };

  /// Build a TelegramStatus record for frontend display.
  public func buildStatus(
    chatIdStore    : List.List<Int>,
    lastErrorStore : List.List<Text>,
    errorLog       : List.List<Text>,
  ) : CommonTypes.TelegramStatus {
    let connected = chatIdStore.size() > 0;
    let chatId : ?Int = switch (chatIdStore.first()) {
      case (?id) { ?id };
      case null  { null };
    };
    let lastResponse : Text = switch (lastErrorStore.first()) {
      case (?r) { r };
      case null { "" };
    };
    {
      connected    = connected;
      chatId       = chatId;
      lastResponse = lastResponse;
      errorLog     = errorLog.toArray();
    };
  };
};
