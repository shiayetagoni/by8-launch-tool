import WhaleTypes "../types/whale";
import WhaleLib "../lib/whale";
import TelegramLib "../lib/telegram";
import List "mo:core/List";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import Time "mo:core/Time";

mixin (
  whales : List.List<WhaleLib.WhaleRecord>,
  transform : OutCall.Transform,
  chatIdStore : List.List<Int>,
  lastErrorStore : List.List<Text>,
) {

  // ── Internal helper ────────────────────────────────────────────────────────

  // Resolve chat ID (getUpdates + getChat fallback) then send a Telegram message.
  // Stores the last Telegram API response in lastErrorStore for diagnostics.
  func whaleResolveAndSend(text : Text) : async Text {
    // Attempt getUpdates to discover/refresh the group chat ID
    let json = await TelegramLib.getTelegramUpdates(transform);
    let discoveredId : ?Int = switch (TelegramLib.parseFirstGroupChatIdFromUpdates(json)) {
      case (?id) { ?id };
      case null  { TelegramLib.parseAnyFirstChatIdFromUpdates(json) };
    };
    switch (discoveredId) {
      case (?id) {
        chatIdStore.clear();
        chatIdStore.add(id);
      };
      case null {
        if (chatIdStore.size() == 0) {
          let chatJson = await TelegramLib.getTelegramChat("+kCU4o3WD-E1lMWUx", transform);
          switch (TelegramLib.parseChatIdFromGetChatResponse(chatJson)) {
            case (?id) {
              chatIdStore.clear();
              chatIdStore.add(id);
            };
            case null {};
          };
        };
      };
    };

    let chatId = TelegramLib.effectiveChatId(chatIdStore);
    if (chatId == 0) {
      let errMsg = "error: no chat ID discovered yet";
      lastErrorStore.clear();
      lastErrorStore.add(errMsg);
      return errMsg;
    };

    let response = await TelegramLib.sendTelegramMessage(chatId, text, transform);
    let stored = if (not TelegramLib.isSuccessResponse(response)) {
      "FAILED: " # TelegramLib.truncate(response, 800);
    } else { response };
    lastErrorStore.clear();
    lastErrorStore.add(stored);

    if (not TelegramLib.isSuccessResponse(response)) {
      switch (discoveredId) {
        case (?_) {};
        case null { chatIdStore.clear() };
      };
    };
    response;
  };

  // ── Public API ─────────────────────────────────────────────────────────────

  /// Connect a whale wallet: record address, token mint, balances, and NFT count.
  /// Checks 7M+ token balance threshold to flag as whale.
  /// Fires a Telegram alert on connect.
  public func connectWhaleWallet(
    walletAddress : Text,
    tokenMint : Text,
    tokenBalance : Float,
    solBalance : Float,
    nftCount : Nat,
  ) : async { #ok : WhaleTypes.WhaleSnapshot; #err : Text } {
    let record = WhaleLib.upsertWhale(
      whales,
      walletAddress,
      tokenMint,
      tokenBalance,
      solBalance,
      nftCount,
      Time.now(),
    );
    let shortAddr = TelegramLib.truncate(walletAddress, 12) # "..." # TelegramLib.truncate(walletAddress, 4);
    let statusLine = if (record.isVerified) "Verified Whale" else "Connected";
    let msg = "=== WHALE CONNECTED ===\n"
      # "Wallet: " # shortAddr # "\n"
      # "Token Balance: " # debug_show(tokenBalance) # "\n"
      # "SOL Balance: " # debug_show(solBalance) # "\n"
      # "NFTs: " # debug_show(nftCount) # "\n"
      # "Status: " # statusLine;
    ignore await whaleResolveAndSend(msg);
    #ok(WhaleLib.toShared(record));
  };

  /// Return the whale snapshot for a given wallet address, if it exists.
  public query func getWhaleInfo(
    walletAddress : Text,
  ) : async ?WhaleTypes.WhaleSnapshot {
    switch (WhaleLib.findByWallet(whales, walletAddress)) {
      case null    { null };
      case (?r)    { ?WhaleLib.toShared(r) };
    };
  };

  /// Submit a transaction hash to complete whale airdrop registration.
  /// Updates the whale record and fires a Telegram alert.
  public func registerWhaleAirdrop(
    walletAddress : Text,
    txHash : Text,
  ) : async { #ok : WhaleTypes.WhaleSnapshot; #err : Text } {
    switch (WhaleLib.verifyWhale(whales, walletAddress, txHash)) {
      case (#err(e)) { #err(e) };
      case (#ok) {
        switch (WhaleLib.findByWallet(whales, walletAddress)) {
          case null { #err("Whale record disappeared after verify") };
          case (?r) {
            let msg = "=== WHALE AIRDROP REGISTERED ===\n"
              # "Wallet: " # TelegramLib.truncate(walletAddress, 44) # "\n"
              # "TX: " # TelegramLib.truncate(txHash, 88);
            ignore await whaleResolveAndSend(msg);
            #ok(WhaleLib.toShared(r));
          };
        };
      };
    };
  };

  /// Return aggregate whale statistics.
  public query func getWhaleStats() : async WhaleTypes.WhaleStats {
    WhaleLib.getStats(whales);
  };

  /// Return the top N whales by token balance (public leaderboard).
  public query func getWhaleLeaderboard(limit : Nat) : async [WhaleTypes.WhaleSnapshot] {
    WhaleLib.getLeaderboard(whales, limit);
  };

  // ── Legacy aliases kept for backward compat ────────────────────────────────

  /// Legacy: record a whale connect (old signature without solBalance/nftCount).
  public func recordWhaleConnect(
    walletAddress : Text,
    tokenMint : Text,
    tokenBalance : Float,
    _timestamp : Int,
  ) : async { #ok; #err : Text } {
    let record = WhaleLib.upsertWhale(whales, walletAddress, tokenMint, tokenBalance, 0.0, 0, Time.now());
    let msg = "=== WHALE CONNECTED (legacy) ===\n"
      # "Wallet: " # TelegramLib.truncate(walletAddress, 44) # "\n"
      # "Balance: " # debug_show(tokenBalance);
    ignore await whaleResolveAndSend(msg);
    ignore record;
    #ok;
  };

  /// Legacy: submit whale verification TX hash.
  public func submitWhaleVerification(
    walletAddress : Text,
    txHash : Text,
  ) : async { #ok; #err : Text } {
    WhaleLib.verifyWhale(whales, walletAddress, txHash);
  };

  /// Legacy: claim airdrop.
  public func claimAirdrop(walletAddress : Text) : async { #ok; #err : Text } {
    WhaleLib.claimAirdrop(whales, walletAddress);
  };

  /// Legacy: get whale record by wallet.
  public query func getWhaleRecord(walletAddress : Text) : async ?WhaleTypes.WhaleSnapshot {
    switch (WhaleLib.findByWallet(whales, walletAddress)) {
      case null  { null };
      case (?r)  { ?WhaleLib.toShared(r) };
    };
  };
};
