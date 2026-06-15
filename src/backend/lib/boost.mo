import Types "../types/boost";
import List "mo:core/List";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Order "mo:core/Order";

module {
  let MIN_SOL : Float = 0.5;

  // ── Seed data ─────────────────────────────────────────────────────────────

  let SEED_WALLETS = [
    "7xKtP2vQm8nRsW3fYhD6bLcE9jAzUo1pNi5sT4mPQ",
    "3bNw9vXk1mQpR7cYsH4fGdZ8eJaWu2oLi6tE5nBkM",
    "9rFg4hSv2yNmK8dPbX3wTcA7zQeUj1oR6lI5nVpYs",
    "5cLm7kDp3xWnH9qSbY2vGfR4tZeUa8oJ1iN6mBwKx",
    "2tHj6sRv4yNpK1dLbX8wMcA9zQeUf3oT7lI5nVqYr",
  ];

  let SEED_MINTS = [
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    "mSoLzYCxHdYgdzU16g5QSh3i5K3z1Kmud5qY25GDyAs",
    "So11111111111111111111111111111111111111112",
    "kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAoFe3",
  ];

  // Tiers: Starter=0.5, Basic=1.0, Standard=2.0, Growth=3.5, Pro=7.0, Elite=12.0, Ultra=20.0, Whale=35.0
  let SEED_TIERS : [Float] = [0.5, 1.0, 2.0, 3.5, 7.0, 12.0, 20.0, 35.0];

  public func seedData(
    boosts : List.List<Types.BoostRecord>,
    uniqueMints : Set.Set<Text>,
  ) {
    if (not boosts.isEmpty()) return; // only seed when empty
    let now = Time.now();
    let day : Int = 86_400_000_000_000; // nanoseconds

    // 20 seed records spread across last 7 days
    let seeds : [(Nat, Nat, Nat, Int)] = [
      // (walletIdx, mintIdx, tierIdx, daysAgo * day)
      (0, 0, 7, 0),   // 35.0 SOL  Whale,    today
      (1, 1, 6, 0),   // 20.0 SOL  Ultra,    today
      (2, 2, 5, 1),   // 12.0 SOL  Elite,    1d ago
      (0, 3, 4, 1),   //  7.0 SOL  Pro,      1d ago
      (3, 4, 3, 1),   //  3.5 SOL  Growth,   1d ago
      (4, 5, 2, 2),   //  2.0 SOL  Standard, 2d ago
      (1, 0, 7, 2),   // 35.0 SOL  Whale,    2d ago
      (2, 6, 0, 2),   //  0.5 SOL  Starter,  2d ago
      (0, 1, 6, 3),   // 20.0 SOL  Ultra,    3d ago
      (3, 2, 5, 3),   // 12.0 SOL  Elite,    3d ago
      (4, 3, 4, 3),   //  7.0 SOL  Pro,      3d ago
      (1, 4, 3, 4),   //  3.5 SOL  Growth,   4d ago
      (2, 5, 2, 4),   //  2.0 SOL  Standard, 4d ago
      (0, 6, 1, 4),   //  1.0 SOL  Basic,    4d ago
      (3, 0, 7, 5),   // 35.0 SOL  Whale,    5d ago
      (4, 1, 6, 5),   // 20.0 SOL  Ultra,    5d ago
      (0, 2, 5, 5),   // 12.0 SOL  Elite,    5d ago
      (1, 3, 4, 6),   //  7.0 SOL  Pro,      6d ago
      (2, 4, 3, 6),   //  3.5 SOL  Growth,   6d ago
      (3, 5, 0, 7),   //  0.5 SOL  Starter,  7d ago
    ];

    for ((wi, mi, ti, offsetDays) in seeds.values()) {
      let wallet = SEED_WALLETS[wi];
      let mint = SEED_MINTS[mi];
      let tier = SEED_TIERS[ti];
      let timestamp = now - (offsetDays * day);
      let txHash = "SEED" # wi.toText() # mi.toText() # ti.toText();
      boosts.add({ mint; tier; txHash; timestamp; wallet });
      uniqueMints.add(mint);
    };
  };

  // ── Core record ───────────────────────────────────────────────────────────

  public func recordBoost(
    boosts : List.List<Types.BoostRecord>,
    uniqueMints : Set.Set<Text>,
    mint : Text,
    tier : Float,
    txHash : Text,
    timestamp : Int,
    wallet : Text,
  ) : { #ok : Types.BoostRecord; #err : Text } {
    if (tier < MIN_SOL) {
      return #err("Boost tier must be at least 0.5 SOL");
    };
    let record : Types.BoostRecord = { mint; tier; txHash; timestamp; wallet };
    boosts.add(record);
    uniqueMints.add(mint);
    #ok(record);
  };

  // ── Analytics ─────────────────────────────────────────────────────────────

  public func getAnalytics(
    boosts : List.List<Types.BoostRecord>,
    uniqueMints : Set.Set<Text>,
  ) : Types.AnalyticsResult {
    let total = boosts.size();
    let totalSol = boosts.foldLeft(0.0, func(acc : Float, r : Types.BoostRecord) : Float { acc + r.tier });
    let recent = recentBoosts(boosts, 10);
    let avgSol : Float = if (total == 0) 0.0 else totalSol / total.toFloat();

    // Find top wallet by total SOL
    let walletTotals = Map.empty<Text, Float>();
    boosts.forEach(func(r : Types.BoostRecord) {
      if (r.wallet != "") {
        switch (walletTotals.get(r.wallet)) {
          case (?prev) { walletTotals.add(r.wallet, prev + r.tier) };
          case null    { walletTotals.add(r.wallet, r.tier) };
        };
      };
    });
    var topWallet : ?Text = null;
    var topSol : Float = 0.0;
    for ((w, s) in walletTotals.entries()) {
      if (s > topSol) { topSol := s; topWallet := ?w };
    };

    {
      totalBoosts = total;
      totalSolCollected = totalSol;
      uniqueTokens = uniqueMints.size();
      recentBoosts = recent;
      topWallet;
      avgBoostSol = avgSol;
    };
  };

  // ── Recent ────────────────────────────────────────────────────────────────

  public func recentBoosts(
    boosts : List.List<Types.BoostRecord>,
    limit : Nat,
  ) : [Types.BoostRecord] {
    let all = boosts.toArray();
    let size = all.size();
    if (size == 0) return [];
    let take = if (size < limit) size else limit;
    let from : Nat = if (size >= take) size - take else 0;
    all.sliceToArray(from, size);
  };

  // ── Leaderboard helpers ───────────────────────────────────────────────────

  // Build wallet-aggregated leaderboard from a filtered (or full) boost array
  func buildLeaderboard(
    filtered : [Types.BoostRecord],
    limit : Nat,
  ) : [Types.LeaderboardEntry] {
    type Acc = {
      var totalSol : Float;
      var boostCount : Nat;
      var lastTs : Int;
      mints : Set.Set<Text>;
    };
    let totals = Map.empty<Text, Acc>();

    for (r in filtered.values()) {
      let key = if (r.wallet == "") "anonymous" else r.wallet;
      switch (totals.get(key)) {
        case (?acc) {
          acc.totalSol += r.tier;
          acc.boostCount += 1;
          if (r.timestamp > acc.lastTs) acc.lastTs := r.timestamp;
          acc.mints.add(r.mint);
        };
        case null {
          let mints = Set.empty<Text>();
          mints.add(r.mint);
          totals.add(key, { var totalSol = r.tier; var boostCount = 1; var lastTs = r.timestamp; mints });
        };
      };
    };

    let entries : [Types.LeaderboardEntry] = totals.entries().map<(Text, Acc), Types.LeaderboardEntry>(
      func((wallet, acc)) {
        {
          wallet;
          totalSol = acc.totalSol;
          boostCount = acc.boostCount;
          lastBoostTimestamp = acc.lastTs;
          tokensBoosted = acc.mints.toArray();
        }
      }
    ).toArray();

    let sorted = entries.sort(func(a : Types.LeaderboardEntry, b : Types.LeaderboardEntry) : Order.Order {
      if (a.totalSol > b.totalSol) #less
      else if (a.totalSol < b.totalSol) #greater
      else #equal
    });
    let take = if (sorted.size() < limit) sorted.size() else limit;
    sorted.sliceToArray(0, take);
  };

  public func getTopBoosters(
    boosts : List.List<Types.BoostRecord>,
    limit : Nat,
  ) : [Types.LeaderboardEntry] {
    buildLeaderboard(boosts.toArray(), limit);
  };

  public func getTopBoostersByPeriod(
    boosts : List.List<Types.BoostRecord>,
    limit : Nat,
    periodDays : Nat,
  ) : [Types.LeaderboardEntry] {
    let all = boosts.toArray();
    if (periodDays == 0) return buildLeaderboard(all, limit);
    let cutoff : Int = Time.now() - (periodDays.toInt() * 86_400_000_000_000);
    let filtered = all.filter(func(r : Types.BoostRecord) : Bool { r.timestamp >= cutoff });
    buildLeaderboard(filtered, limit);
  };

  // ── Wallet stats ──────────────────────────────────────────────────────────

  public func getWalletStats(
    boosts : List.List<Types.BoostRecord>,
    wallet : Text,
  ) : ?Types.WalletStats {
    let walletBoosts = boosts.toArray().filter(func(r : Types.BoostRecord) : Bool { r.wallet == wallet });
    if (walletBoosts.size() == 0) return null;

    var totalSol : Float = 0.0;
    var lastTs : Int = 0;
    let mints = Set.empty<Text>();

    for (r in walletBoosts.values()) {
      totalSol += r.tier;
      if (r.timestamp > lastTs) lastTs := r.timestamp;
      mints.add(r.mint);
    };

    let recent = walletBoosts.sort(func(a : Types.BoostRecord, b : Types.BoostRecord) : Order.Order {
      if (a.timestamp > b.timestamp) #less
      else if (a.timestamp < b.timestamp) #greater
      else #equal
    });
    let take = if (recent.size() < 5) recent.size() else 5;

    ?{
      wallet;
      totalSol;
      boostCount = walletBoosts.size();
      lastBoostTimestamp = lastTs;
      tokensBoosted = mints.toArray();
      recentBoosts = recent.sliceToArray(0, take);
    };
  };

  // ── Token history ─────────────────────────────────────────────────────────

  public func getTokenHistory(
    boosts : List.List<Types.BoostRecord>,
    mint : Text,
  ) : [Types.BoostRecord] {
    let filtered = boosts.toArray().filter(func(r : Types.BoostRecord) : Bool { r.mint == mint });
    filtered.sort(func(a : Types.BoostRecord, b : Types.BoostRecord) : Order.Order {
      if (a.timestamp > b.timestamp) #less
      else if (a.timestamp < b.timestamp) #greater
      else #equal
    });
  };
};
