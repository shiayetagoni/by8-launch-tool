import OutCall "mo:caffeineai-http-outcalls/outcall";
import Blob "mo:core/Blob";
import IC "ic:aaaaa-aa";
import List "mo:core/List";
import Set "mo:core/Set";
import BoostTypes "types/boost";
import CommonTypes "types/common";
import LaunchTypes "types/launch";
import BoostLib "lib/boost";
import HeliusLib "lib/helius";
import LaunchLib "lib/launch";
import BoostApi "mixins/boost-api";
import TelegramApi "mixins/telegram-api";
import WhaleApi "mixins/whale-api";
import WhaleLib "lib/whale";
import LaunchApi "mixins/launch-api";





actor {
  let httpRequestCycles = 600_000_000_000;

  // Persistent state — boost records and unique mint tracking
  let boosts = List.empty<BoostTypes.BoostRecord>();
  let uniqueMints = Set.empty<Text>();

  // Persistent state — whale records
  let whales = List.empty<WhaleLib.WhaleRecord>();

  // Persistent state — token launch records
  let launches = List.empty<LaunchTypes.TokenLaunchRecord>();

  // Shared Telegram chat ID store — size 0 = not set, size 1 = set.
  let chatIdStore = List.empty<Int>();

  // Stores the last raw Telegram API response for debugging.
  let lastErrorStore = List.empty<Text>();

  // Persistent Telegram error log (up to 10 most recent errors).
  let telegramErrorLog = List.empty<Text>();

  // Auto-seed demo data on first deploy (no-op if records already exist)
  BoostLib.seedData(boosts, uniqueMints);

  // Transform function for HTTP outcalls (must be a query method on this actor)
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Transform for Helius responses (kept for backward-compat, delegates to generic transform)
  public query func transformHelius(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Transform for Solscan responses
  public query func transformSolscan(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Transform for Jupiter responses
  public query func transformJupiter(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Transform for Dexscreener responses
  public query func transformDexscreener(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // Mixin composition — pass chatIdStore and lastErrorStore so both mixins share state
  include BoostApi(boosts, uniqueMints, transform, chatIdStore);
  include TelegramApi(boosts, uniqueMints, transform, chatIdStore, lastErrorStore, telegramErrorLog);
  include WhaleApi(whales, transform, chatIdStore, lastErrorStore);
  include LaunchApi(launches);

  func httpGet(url : Text) : async { #ok : Text; #err : Text } {
    let request : IC.http_request_args = {
      url;
      max_response_bytes = null;
      headers = [{ name = "User-Agent"; value = "caffeine.ai" }];
      body = null;
      method = #get;
      transform = ?{
        function = transform;
        context = Blob.fromArray([]);
      };
      is_replicated = ?false;
    };
    let response = await (with cycles = httpRequestCycles) IC.http_request(request);
    if (response.status != 200) {
      return #err("HTTP " # debug_show(response.status));
    };
    switch (response.body.decodeUtf8()) {
      case (null) { #err("Failed to decode response body") };
      case (?text) { #ok(text) };
    };
  };

  public func getTrendingTokens(limit : Nat) : async { #ok : Text; #err : Text } {
    let url = "https://frontend-api.pump.fun/coins?limit="
      # debug_show(limit)
      # "&sort=last_trade_timestamp_seconds&includeNsfw=false&offset=0";
    await httpGet(url);
  };

  public func getTokenDetail(mint : Text) : async { #ok : Text; #err : Text } {
    let url = "https://frontend-api.pump.fun/coins/" # mint;
    await httpGet(url);
  };

  /// Multi-chain token lookup: auto-detects Solana vs EVM from CA format.
  /// chainHint (optional): "ethereum", "base", "bsc", "polygon", "arbitrum", "avalanche"
  public func lookupTokenMultiChain(ca : Text, chainHint : ?Text) : async { #ok : CommonTypes.TokenMetadata; #err : Text } {
    await HeliusLib.fetchTokenMultiChain(ca, chainHint, transform);
  };

  /// Fetch real on-chain token metadata using a three-source Solana cascade:
  ///   1. Solscan (primary)  2. Jupiter (fallback)  3. Dexscreener (fallback)
  public func fetchTokenMetadata(ca : Text) : async { #ok : CommonTypes.TokenMetadata; #err : Text } {
    // Primary: Solscan
    let solscanResult = await HeliusLib.fetchSolscan(ca, transformSolscan);
    switch (solscanResult) {
      case (#ok(meta)) { return #ok(meta) };
      case (#err(e1)) {
        // Secondary: Jupiter
        let jupiterResult = await HeliusLib.fetchJupiter(ca, transformJupiter);
        switch (jupiterResult) {
          case (#ok(meta)) { return #ok(meta) };
          case (#err(e2)) {
            // Tertiary: Dexscreener
            let dexResult = await HeliusLib.fetchDexscreener(ca, transformDexscreener);
            switch (dexResult) {
              case (#ok(meta)) { #ok(meta) };
              case (#err(e3)) {
                #err(
                  "Token not found on any provider. " #
                  "Solscan: " # e1 # " | " #
                  "Jupiter: " # e2 # " | " #
                  "Dexscreener: " # e3
                )
              };
            };
          };
        };
      };
    };
  };
};
