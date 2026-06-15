module {
  /// Status of a token launch record.
  public type LaunchStatus = {
    #pending;  // awaiting payment confirmation
    #paid;     // payment confirmed, launch in progress
    #failed;   // payment failed or launch aborted
  };

  /// Allocation breakdown submitted by the user.
  public type AllocationBreakdown = {
    team        : Nat; // percentage 0-100
    liquidity   : Nat;
    community   : Nat;
    marketing   : Nat;
    reserve     : Nat;
  };

  /// Input data for creating a launch record.
  public type LaunchData = {
    tokenName          : Text;
    symbol             : Text;
    supply             : Nat;
    decimals           : Nat8;
    description        : Text;
    selectedChain      : Text; // "solana" | "ethereum" | "base" | ...
    selectedPlatform   : Text; // "pump.fun" | "raydium" | "uniswap" | ...
    launchType         : Text; // "fair-launch" | "presale" | "stealth" | ...
    allocationBreakdown : AllocationBreakdown;
    paymentTxHash      : Text;
    paymentWallet      : Text; // destination wallet for payment
  };

  /// Stored launch record including server-assigned fields.
  public type TokenLaunchRecord = {
    id               : Text;
    tokenName        : Text;
    symbol           : Text;
    supply           : Nat;
    decimals         : Nat8;
    description      : Text;
    selectedChain    : Text;
    selectedPlatform : Text;
    launchType       : Text;
    allocationBreakdown : AllocationBreakdown;
    paymentTxHash    : Text;
    paymentWallet    : Text;
    var status       : LaunchStatus;
    timestamp        : Int;
  };

  /// Immutable snapshot of a launch record, safe to return across canister boundary.
  public type LaunchSnapshot = {
    id               : Text;
    tokenName        : Text;
    symbol           : Text;
    supply           : Nat;
    decimals         : Nat8;
    description      : Text;
    selectedChain    : Text;
    selectedPlatform : Text;
    launchType       : Text;
    allocationBreakdown : AllocationBreakdown;
    paymentTxHash    : Text;
    paymentWallet    : Text;
    status           : Text; // "pending" | "paid" | "failed"
    timestamp        : Int;
  };
};
