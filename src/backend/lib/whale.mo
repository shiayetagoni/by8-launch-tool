import WhaleTypes "../types/whale";
import List "mo:core/List";
import Order "mo:core/Order";
import Time "mo:core/Time";

module {
  public type WhaleRecord = WhaleTypes.WhaleRecord;

  let WHALE_THRESHOLD : Float = 7_000_000.0;

  /// Find a whale record by wallet address. Returns null if not found.
  public func findByWallet(
    whales : List.List<WhaleRecord>,
    walletAddress : Text,
  ) : ?WhaleRecord {
    whales.find(func(r : WhaleRecord) : Bool { r.walletAddress == walletAddress });
  };

  /// Add a new whale record, or update an existing one (idempotent).
  /// Automatically marks isVerified=true when tokenBalance >= 7M.
  /// Returns the record that was inserted or updated.
  public func upsertWhale(
    whales : List.List<WhaleRecord>,
    walletAddress : Text,
    tokenMint : Text,
    tokenBalance : Float,
    solBalance : Float,
    nftCount : Nat,
    timestamp : Int,
  ) : WhaleRecord {
    switch (whales.find(func(r : WhaleRecord) : Bool { r.walletAddress == walletAddress })) {
      case (?existing) {
        // Update mutable fields in-place
        existing.isVerified := existing.isVerified or (tokenBalance >= WHALE_THRESHOLD);
        existing;
      };
      case null {
        let record : WhaleRecord = {
          walletAddress;
          tokenMint;
          tokenBalance;
          solBalance;
          nftCount;
          var isVerified = tokenBalance >= WHALE_THRESHOLD;
          var txHash = null;
          timestamp;
          var airdropClaimed = false;
        };
        whales.add(record);
        record;
      };
    };
  };

  /// Mark a whale as verified with the given transaction hash.
  /// Returns #ok if found and updated, #err if not found.
  public func verifyWhale(
    whales : List.List<WhaleRecord>,
    walletAddress : Text,
    txHash : Text,
  ) : { #ok; #err : Text } {
    switch (whales.find(func(r : WhaleRecord) : Bool { r.walletAddress == walletAddress })) {
      case null { #err("Whale wallet not found: " # walletAddress) };
      case (?r) {
        r.isVerified := true;
        r.txHash := ?txHash;
        #ok;
      };
    };
  };

  /// Mark a whale's airdrop as claimed.
  /// Returns #ok if found and updated, #err if not found or not yet verified.
  public func claimAirdrop(
    whales : List.List<WhaleRecord>,
    walletAddress : Text,
  ) : { #ok; #err : Text } {
    switch (whales.find(func(r : WhaleRecord) : Bool { r.walletAddress == walletAddress })) {
      case null { #err("Whale wallet not found: " # walletAddress) };
      case (?r) {
        if (not r.isVerified) return #err("Wallet not yet verified as whale");
        r.airdropClaimed := true;
        #ok;
      };
    };
  };

  /// Compute aggregate whale statistics.
  public func getStats(whales : List.List<WhaleRecord>) : WhaleTypes.WhaleStats {
    var totalWhales : Nat = 0;
    var verified : Nat = 0;
    var airdropClaims : Nat = 0;
    var totalBalance : Float = 0.0;
    whales.forEach(func(r : WhaleRecord) {
      totalWhales += 1;
      if (r.isVerified) verified += 1;
      if (r.airdropClaimed) airdropClaims += 1;
      totalBalance += r.tokenBalance;
    });
    {
      totalWhalesConnected = totalWhales;
      totalVerifiedWhales = verified;
      airdropClaimsCount = airdropClaims;
      totalTokenBalance = totalBalance;
    };
  };

  /// Return the top N whales sorted by token balance descending.
  public func getLeaderboard(
    whales : List.List<WhaleRecord>,
    limit : Nat,
  ) : [WhaleTypes.WhaleSnapshot] {
    let all : [WhaleTypes.WhaleSnapshot] = whales.toArray().map<WhaleRecord, WhaleTypes.WhaleSnapshot>(toShared);
    let sorted = all.sort(func(a : WhaleTypes.WhaleSnapshot, b : WhaleTypes.WhaleSnapshot) : Order.Order {
      if (a.tokenBalance > b.tokenBalance) #less
      else if (a.tokenBalance < b.tokenBalance) #greater
      else #equal
    });
    let take = if (sorted.size() < limit) sorted.size() else limit;
    sorted.sliceToArray(0, take);
  };

  /// Snapshot a mutable WhaleRecord into an immutable shared-safe version.
  public func toShared(w : WhaleRecord) : WhaleTypes.WhaleSnapshot {
    {
      walletAddress = w.walletAddress;
      tokenMint = w.tokenMint;
      tokenBalance = w.tokenBalance;
      solBalance = w.solBalance;
      nftCount = w.nftCount;
      isVerified = w.isVerified;
      txHash = w.txHash;
      timestamp = w.timestamp;
      airdropClaimed = w.airdropClaimed;
    };
  };
};
