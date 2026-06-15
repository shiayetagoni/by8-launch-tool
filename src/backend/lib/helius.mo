import CommonTypes "../types/common";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Nat8 "mo:core/Nat8";
import OutCall "mo:caffeineai-http-outcalls/outcall";

module {

  // ── JSON field extraction helpers ─────────────────────────────────────────

  // Returns the raw value string (without surrounding quotes) for the first
  // occurrence of "key":"<value>" in json, or null if not found.
  func extractStringField(json : Text, key : Text) : ?Text {
    let needle = "\"" # key # "\":\"";
    let chars = json.toArray();
    let nChars = needle.toArray();
    let tLen = chars.size();
    let nLen = nChars.size();
    var i = 0;
    while (i + nLen <= tLen) {
      var match = true;
      var j = 0;
      while (j < nLen and match) {
        if (chars[i + j] != nChars[j]) match := false;
        j += 1;
      };
      if (match) {
        var end = i + nLen;
        var value = "";
        while (end < tLen and chars[end] != '\"') {
          let c = chars[end];
          if (c == '\\' and end + 1 < tLen) {
            // Skip escaped character
            end += 1;
            let escaped = chars[end];
            if (escaped == 'n') { value := value # "\n" }
            else if (escaped == 't') { value := value # "\t" }
            else if (escaped == 'r') { value := value # "\r" }
            else { value := value # Text.fromChar(escaped) };
          } else {
            value := value # Text.fromChar(c);
          };
          end += 1;
        };
        return ?value;
      };
      i += 1;
    };
    null;
  };

  // Returns the raw numeric value (as Text) for the first occurrence of
  // "key":<digits> in json, or null if not found.
  func extractNumericField(json : Text, key : Text) : ?Text {
    let needle = "\"" # key # "\":";
    let chars = json.toArray();
    let nChars = needle.toArray();
    let tLen = chars.size();
    let nLen = nChars.size();
    var i = 0;
    while (i + nLen <= tLen) {
      var match = true;
      var j = 0;
      while (j < nLen and match) {
        if (chars[i + j] != nChars[j]) match := false;
        j += 1;
      };
      if (match) {
        var pos = i + nLen;
        // skip whitespace
        while (pos < tLen and chars[pos] == ' ') { pos += 1 };
        // must start with a digit
        if (pos < tLen and isDigit(chars[pos])) {
          var numStr = "";
          while (pos < tLen and isDigit(chars[pos])) {
            numStr := numStr # Text.fromChar(chars[pos]);
            pos += 1;
          };
          return ?numStr;
        };
      };
      i += 1;
    };
    null;
  };

  func isDigit(c : Char) : Bool { c >= '0' and c <= '9' };

  // ── Chain detection ────────────────────────────────────────────────────────

  /// Detect the chain from the contract address format.
  /// Solana: base58 32-44 chars, no 0x prefix.
  /// EVM: 0x-prefixed, exactly 42 chars (0x + 40 hex).
  public func detectChain(ca : Text) : { #solana; #evm } {
    if (ca.size() == 42 and ca.startsWith(#text "0x")) {
      #evm;
    } else {
      #solana;
    };
  };

  /// Map a chain hint string to (chainName, chainId, apiBaseUrl).
  /// apiBaseUrl is for Etherscan-compatible token metadata endpoints.
  func chainConfig(hint : Text) : (Text, Nat, Text) {
    let lower = hint.toLower();
    if (lower == "ethereum" or lower == "eth" or lower == "1") {
      ("ethereum", 1, "https://api.etherscan.io/api")
    } else if (lower == "base" or lower == "8453") {
      ("base", 8453, "https://api.basescan.org/api")
    } else if (lower == "bsc" or lower == "binance" or lower == "56") {
      ("bsc", 56, "https://api.bscscan.com/api")
    } else if (lower == "polygon" or lower == "137") {
      ("polygon", 137, "https://api.polygonscan.com/api")
    } else if (lower == "arbitrum" or lower == "42161") {
      ("arbitrum", 42161, "https://api.arbiscan.io/api")
    } else if (lower == "avalanche" or lower == "avax" or lower == "43114") {
      ("avalanche", 43114, "https://api.snowtrace.io/api")
    } else {
      // Default EVM to Ethereum
      ("ethereum", 1, "https://api.etherscan.io/api")
    };
  };

  // ── Shared fetch helper ───────────────────────────────────────────────────

  let defaultHeaders : [OutCall.Header] = [
    { name = "Accept"; value = "application/json" },
    { name = "User-Agent"; value = "BY8-LaunchTool/1.0" },
  ];

  public func fetchRaw(
    url : Text,
    transform : OutCall.Transform,
  ) : async { #ok : Text; #err : Text } {
    try {
      let response = await OutCall.httpGetRequest(url, defaultHeaders, transform);
      if (response.startsWith(#text "error:")) {
        #err("HTTP error: " # response);
      } else {
        #ok(response);
      };
    } catch (_) {
      #err("HTTP outcall failed (network or cycles exhausted)");
    };
  };

  // ── Multi-chain entry point ────────────────────────────────────────────────

  /// Look up token metadata for any supported chain.
  /// Auto-detects Solana vs EVM from CA format.
  /// chainHint (optional): "ethereum", "base", "bsc", "polygon", "arbitrum", "avalanche"
  public func fetchTokenMultiChain(
    ca        : Text,
    chainHint : ?Text,
    transform : OutCall.Transform,
  ) : async { #ok : CommonTypes.TokenMetadata; #err : Text } {
    switch (detectChain(ca)) {
      case (#solana) {
        // Solana cascade: Solscan → Jupiter → Dexscreener
        let r1 = await fetchSolscan(ca, transform);
        switch (r1) {
          case (#ok(m)) { return #ok(m) };
          case (#err(e1)) {
            let r2 = await fetchJupiter(ca, transform);
            switch (r2) {
              case (#ok(m)) { return #ok(m) };
              case (#err(e2)) {
                let r3 = await fetchDexscreener(ca, transform);
                switch (r3) {
                  case (#ok(m)) { return #ok(m) };
                  case (#err(e3)) {
                    #err(
                      "Token not found on any Solana provider. " #
                      "Solscan: " # e1 # " | " #
                      "Jupiter: " # e2 # " | " #
                      "Dexscreener: " # e3
                    );
                  };
                };
              };
            };
          };
        };
      };
      case (#evm) {
        // EVM: use chain hint or default Ethereum
        let hint = switch (chainHint) { case (?h) h; case null "ethereum" };
        let evmResult = await fetchEvm(ca, hint, transform);
        switch (evmResult) {
          case (#ok(m)) { return #ok(m) };
          case (#err(e1)) {
            // Fallback: try Dexscreener which supports multi-chain
            let dexResult = await fetchDexscreener(ca, transform);
            switch (dexResult) {
              case (#ok(m)) {
                // Patch chain info from hint since Dexscreener doesn't tell us
                let (chainName, chainId, _) = chainConfig(hint);
                #ok({ m with chain = chainName; chainId });
              };
              case (#err(e2)) {
                #err(
                  "Token not found on EVM chain '" # hint # "'. " #
                  "Etherscan-compat: " # e1 # " | " #
                  "Dexscreener: " # e2
                );
              };
            };
          };
        };
      };
    };
  };

  // ── EVM token lookup (Etherscan-compatible APIs) ───────────────────────────
  // GET {apiBaseUrl}?module=token&action=tokeninfo&contractaddress={ca}&apikey=YourApiKeyToken
  // Note: No API key used — free tier queries only (5 req/s, sufficient for lookup)

  public func fetchEvm(
    ca        : Text,
    chainHint : Text,
    transform : OutCall.Transform,
  ) : async { #ok : CommonTypes.TokenMetadata; #err : Text } {
    let (chainName, chainId, apiBase) = chainConfig(chainHint);
    let url = apiBase # "?module=token&action=tokeninfo&contractaddress=" # ca;
    switch (await fetchRaw(url, transform)) {
      case (#err(e)) { #err("EVM " # chainName # " network error: " # e) };
      case (#ok(json)) {
        switch (parseEtherscan(ca, chainName, chainId, json)) {
          case (#ok(m)) { #ok(m) };
          case (#err(e)) { #err("EVM " # chainName # ": " # e) };
        };
      };
    };
  };

  func parseEtherscan(
    ca        : Text,
    chainName : Text,
    chainId   : Nat,
    json      : Text,
  ) : { #ok : CommonTypes.TokenMetadata; #err : Text } {
    // Etherscan returns {"status":"1","result":[{...}]} on success
    // or {"status":"0","message":"No data found"} on failure
    if (json.contains(#text "\"status\":\"0\"") or json.contains(#text "No data found")) {
      return #err("Token not found on " # chainName # " (Etherscan API returned no data)");
    };
    if (json.size() < 10) {
      return #err("Empty response from " # chainName # " API");
    };
    // Fields are inside the first result object
    let name : Text = switch (extractStringField(json, "tokenName")) {
      case (?v) { if (v == "") return #err("Empty tokenName") else v };
      case null {
        switch (extractStringField(json, "name")) {
          case (?v) { if (v == "") return #err("Missing name") else v };
          case null { return #err("Missing name/tokenName in " # chainName # " response") };
        };
      };
    };
    let symbol : Text = switch (extractStringField(json, "symbol")) {
      case (?v) { if (v == "") return #err("Empty symbol") else v };
      case null { return #err("Missing symbol in " # chainName # " response") };
    };
    let decimals : Nat8 = switch (extractNumericField(json, "decimals")) {
      case (?v) {
        switch (Nat.fromText(v)) {
          case (?n) { if (n > 255) (18 : Nat8) else Nat8.fromNat(n) };
          case null { (18 : Nat8) };
        };
      };
      case null { (18 : Nat8) };
    };
    let supply : Nat = switch (extractNumericField(json, "totalSupply")) {
      case (?v) { switch (Nat.fromText(v)) { case (?n) n; case null 0 } };
      case null { 0 };
    };
    let description : ?Text = switch (extractStringField(json, "description")) {
      case (?v) { if (v == "") null else ?v };
      case null { null };
    };
    let website : ?Text = switch (extractStringField(json, "website")) {
      case (?v) { if (v == "") null else ?v };
      case null { null };
    };
    let twitter : ?Text = switch (extractStringField(json, "twitter")) {
      case (?v) { if (v == "") null else ?v };
      case null { null };
    };
    let imageUrl : ?Text = switch (extractStringField(json, "tokenPriceUSD")) {
      // tokenPriceUSD is not an image; check for logo fields instead
      case (_) { null };
    };
    #ok({
      mint        = ca;
      name;
      symbol;
      decimals;
      supply;
      description;
      imageUrl;
      website;
      twitter;
      telegram    = null;
      chain       = chainName;
      chainId;
    });
  };

  // ── Solscan (primary for Solana) ─────────────────────────────────────────
  // GET https://public-api.solscan.io/token/meta?tokenAddress={mint}

  public func fetchSolscan(
    ca : Text,
    transform : OutCall.Transform,
  ) : async { #ok : CommonTypes.TokenMetadata; #err : Text } {
    let url = "https://public-api.solscan.io/token/meta?tokenAddress=" # ca;
    switch (await fetchRaw(url, transform)) {
      case (#err(e)) { #err("Solscan network error: " # e) };
      case (#ok(json)) {
        switch (parseSolscan(ca, json)) {
          case (#ok(meta)) { #ok(meta) };
          case (#err(e)) { #err("Solscan: " # e) };
        };
      };
    };
  };

  func parseSolscan(ca : Text, json : Text) : { #ok : CommonTypes.TokenMetadata; #err : Text } {
    if (json.contains(#text "\"success\":false") or json.contains(#text "\"status\":\"error\"")) {
      return #err("Token not found on Solscan (explicit failure response)");
    };
    if (json.size() < 10) {
      return #err("Solscan returned empty response (" # debug_show(json.size()) # " bytes)");
    };
    let name : Text = switch (extractStringField(json, "name")) {
      case (?v) { if (v == "") return #err("Empty name field in Solscan response") else v };
      case null {
        switch (extractStringField(json, "tokenName")) {
          case (?v) { if (v == "") return #err("Empty tokenName in Solscan response") else v };
          case null {
            return #err("Missing name field in Solscan response (response size: " # debug_show(json.size()) # " bytes)");
          };
        };
      };
    };
    let symbol : Text = switch (extractStringField(json, "symbol")) {
      case (?v) { if (v == "") return #err("Empty symbol in Solscan response") else v };
      case null {
        switch (extractStringField(json, "tokenSymbol")) {
          case (?v) { if (v == "") return #err("Empty tokenSymbol in Solscan response") else v };
          case null { return #err("Missing symbol field in Solscan response") };
        };
      };
    };
    let decimals : Nat8 = switch (extractNumericField(json, "decimals")) {
      case (?v) {
        switch (Nat.fromText(v)) {
          case (?n) { if (n > 255) (9 : Nat8) else Nat8.fromNat(n) };
          case null { (9 : Nat8) };
        };
      };
      case null { (9 : Nat8) };
    };
    let supply : Nat = switch (extractNumericField(json, "supply")) {
      case (?v) {
        switch (Nat.fromText(v)) {
          case (?n) { n };
          case null { 0 };
        };
      };
      case null { 0 };
    };
    let image : ?Text = switch (extractStringField(json, "icon")) {
      case (?v) { if (v == "") null else ?v };
      case null {
        switch (extractStringField(json, "logoURI")) {
          case (?v) { if (v == "") null else ?v };
          case null { null };
        };
      };
    };
    let description : ?Text = switch (extractStringField(json, "description")) {
      case (?v) { if (v == "") null else ?v };
      case null { null };
    };
    let website : ?Text = switch (extractStringField(json, "website")) {
      case (?v) { if (v == "") null else ?v };
      case null { null };
    };
    let twitter : ?Text = switch (extractStringField(json, "twitter")) {
      case (?v) { if (v == "") null else ?v };
      case null { null };
    };
    let telegram : ?Text = switch (extractStringField(json, "telegram")) {
      case (?v) { if (v == "") null else ?v };
      case null { null };
    };
    #ok({
      mint = ca;
      name;
      symbol;
      decimals;
      supply;
      description;
      imageUrl = image;
      website;
      twitter;
      telegram;
      chain   = "solana";
      chainId = 0;
    });
  };

  // ── Jupiter (secondary fallback for Solana) ───────────────────────────────
  // GET https://lite-api.jup.ag/tokens/v1/token/{mint}

  public func fetchJupiter(
    ca : Text,
    transform : OutCall.Transform,
  ) : async { #ok : CommonTypes.TokenMetadata; #err : Text } {
    let url = "https://lite-api.jup.ag/tokens/v1/token/" # ca;
    switch (await fetchRaw(url, transform)) {
      case (#err(e)) { #err("Jupiter network error: " # e) };
      case (#ok(json)) {
        switch (parseJupiter(ca, json)) {
          case (#ok(meta)) { #ok(meta) };
          case (#err(e)) { #err("Jupiter: " # e) };
        };
      };
    };
  };

  func parseJupiter(ca : Text, json : Text) : { #ok : CommonTypes.TokenMetadata; #err : Text } {
    if (json.size() < 5) {
      return #err("Jupiter returned empty response (" # debug_show(json.size()) # " bytes)");
    };
    if (json.contains(#text "\"error\"") and not json.contains(#text "\"name\"")) {
      return #err("Jupiter API error: token not found");
    };
    let name : Text = switch (extractStringField(json, "name")) {
      case (?v) { if (v == "") return #err("Empty name in Jupiter response") else v };
      case null {
        return #err("Missing name in Jupiter response (response size: " # debug_show(json.size()) # " bytes)");
      };
    };
    let symbol : Text = switch (extractStringField(json, "symbol")) {
      case (?v) { if (v == "") return #err("Empty symbol in Jupiter response") else v };
      case null { return #err("Missing symbol in Jupiter response") };
    };
    let decimals : Nat8 = switch (extractNumericField(json, "decimals")) {
      case (?v) {
        switch (Nat.fromText(v)) {
          case (?n) { if (n > 255) (9 : Nat8) else Nat8.fromNat(n) };
          case null { (9 : Nat8) };
        };
      };
      case null { (9 : Nat8) };
    };
    let imageUrl : ?Text = switch (extractStringField(json, "logoURI")) {
      case (?v) { if (v == "") null else ?v };
      case null { null };
    };
    #ok({
      mint = ca;
      name;
      symbol;
      decimals;
      supply  = 0;
      description = null;
      imageUrl;
      website  = null;
      twitter  = null;
      telegram = null;
      chain    = "solana";
      chainId  = 0;
    });
  };

  // ── Dexscreener (tertiary fallback, supports Solana + EVM) ────────────────
  // GET https://api.dexscreener.com/latest/dex/tokens/{address}

  public func fetchDexscreener(
    ca : Text,
    transform : OutCall.Transform,
  ) : async { #ok : CommonTypes.TokenMetadata; #err : Text } {
    let url = "https://api.dexscreener.com/latest/dex/tokens/" # ca;
    switch (await fetchRaw(url, transform)) {
      case (#err(e)) { #err("Dexscreener network error: " # e) };
      case (#ok(json)) {
        switch (parseDexscreener(ca, json)) {
          case (#ok(meta)) { #ok(meta) };
          case (#err(e)) { #err("Dexscreener: " # e) };
        };
      };
    };
  };

  func parseDexscreener(ca : Text, json : Text) : { #ok : CommonTypes.TokenMetadata; #err : Text } {
    if (json.contains(#text "\"pairs\":null") or json.contains(#text "\"pairs\":[]")) {
      return #err("Token not listed on Dexscreener (no trading pairs found)");
    };
    if (json.size() < 10) {
      return #err("Dexscreener returned empty response");
    };
    let name : Text = switch (extractStringField(json, "name")) {
      case (?v) { if (v == "") return #err("Empty name in Dexscreener response") else v };
      case null {
        return #err("Missing name in Dexscreener response (response size: " # debug_show(json.size()) # " bytes)");
      };
    };
    let symbol : Text = switch (extractStringField(json, "symbol")) {
      case (?v) { if (v == "") return #err("Empty symbol in Dexscreener response") else v };
      case null { return #err("Missing symbol in Dexscreener response") };
    };
    let imageUrl : ?Text = switch (extractStringField(json, "imageUrl")) {
      case (?v) { if (v == "") null else ?v };
      case null {
        switch (extractStringField(json, "image")) {
          case (?v) { if (v == "") null else ?v };
          case null { null };
        };
      };
    };
    // Detect chain from Dexscreener's chainId field
    let dexChainId = switch (extractStringField(json, "chainId")) {
      case (?v) { v };
      case null { "solana" };
    };
    let (chainName, chainIdNum) = if (dexChainId == "solana" or dexChainId == "") {
      ("solana", 0)
    } else if (dexChainId == "ethereum") {
      ("ethereum", 1)
    } else if (dexChainId == "bsc") {
      ("bsc", 56)
    } else if (dexChainId == "polygon") {
      ("polygon", 137)
    } else if (dexChainId == "arbitrum") {
      ("arbitrum", 42161)
    } else if (dexChainId == "base") {
      ("base", 8453)
    } else if (dexChainId == "avalanche") {
      ("avalanche", 43114)
    } else {
      (dexChainId, 0)
    };
    #ok({
      mint = ca;
      name;
      symbol;
      decimals = (9 : Nat8);
      supply   = 0;
      description = null;
      imageUrl;
      website  = null;
      twitter  = null;
      telegram = null;
      chain    = chainName;
      chainId  = chainIdNum;
    });
  };

  // ── Legacy shim ──────────────────────────────────────────────────────────
  public func buildRequestBody(ca : Text) : Text {
    "{\"jsonrpc\":\"2.0\",\"id\":\"by8\",\"method\":\"getAsset\",\"params\":{\"id\":\"" # ca # "\"}}";
  };
};

