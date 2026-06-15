module {
  public type WhaleRecord = {
    walletAddress : Text;
    tokenMint     : Text;
    tokenBalance  : Float;
    solBalance    : Float;
    nftCount      : Nat;
    var isVerified    : Bool;
    var txHash        : ?Text;
    timestamp         : Int;
    var airdropClaimed : Bool;
  };

  public type WhaleStats = {
    totalWhalesConnected : Nat;
    totalVerifiedWhales  : Nat;
    airdropClaimsCount   : Nat;
    totalTokenBalance    : Float;
  };

  /// Immutable snapshot of a WhaleRecord, safe to return across canister boundary.
  public type WhaleSnapshot = {
    walletAddress  : Text;
    tokenMint      : Text;
    tokenBalance   : Float;
    solBalance     : Float;
    nftCount       : Nat;
    isVerified     : Bool;
    txHash         : ?Text;
    timestamp      : Int;
    airdropClaimed : Bool;
  };
};
