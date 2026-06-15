module {
  public type BoostRecord = {
    mint : Text;
    tier : Float;
    txHash : Text;
    timestamp : Int;
    wallet : Text; // "" = anonymous
  };

  public type AnalyticsResult = {
    totalBoosts : Nat;
    totalSolCollected : Float;
    uniqueTokens : Nat;
    recentBoosts : [BoostRecord];
    topWallet : ?Text;
    avgBoostSol : Float;
  };

  public type LeaderboardEntry = {
    wallet : Text;
    totalSol : Float;
    boostCount : Nat;
    lastBoostTimestamp : Int;
    tokensBoosted : [Text]; // unique mints
  };

  public type WalletStats = {
    wallet : Text;
    totalSol : Float;
    boostCount : Nat;
    lastBoostTimestamp : Int;
    tokensBoosted : [Text];
    recentBoosts : [BoostRecord];
  };
};
