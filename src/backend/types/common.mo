module {
  public type Timestamp = Int;

  public type Result<T, E> = { #ok : T; #err : E };

  /// Shared-safe token metadata returned from on-chain lookups.
  /// All optional fields may be null when the data source does not provide them.
  /// chain: human-readable chain name e.g. "solana", "ethereum", "base"
  /// chainId: EVM numeric chain ID (0 for Solana)
  public type TokenMetadata = {
    mint        : Text;
    name        : Text;
    symbol      : Text;
    decimals    : Nat8;
    supply      : Nat;
    description : ?Text;
    imageUrl    : ?Text;  // logo / icon URL
    website     : ?Text;
    twitter     : ?Text;
    telegram    : ?Text;
    chain       : Text;   // "solana" | "ethereum" | "base" | "bsc" | "polygon" | "arbitrum" | "avalanche"
    chainId     : Nat;    // 0 = Solana; EVM chain IDs otherwise
  };

  /// Telegram integration status — returned by getTelegramStatus() for frontend display.
  public type TelegramStatus = {
    connected    : Bool;
    chatId       : ?Int;
    lastResponse : Text;
    errorLog     : [Text]; // most recent errors, up to 10 entries
  };
};

