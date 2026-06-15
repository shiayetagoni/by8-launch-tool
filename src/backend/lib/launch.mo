import LaunchTypes "../types/launch";
import List "mo:core/List";
import Time "mo:core/Time";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Int "mo:core/Int";

module {

  let PAYMENT_WALLET = "4VNDpgK6umWjRr3p4823b5bBUK65QR48e6igkXZ7Qmz8";

  // Generate a simple unique ID from timestamp + index.
  func makeId(timestamp : Int, count : Nat) : Text {
    "launch-" # Int.abs(timestamp).toText() # "-" # count.toText();
  };

  /// Create a new launch record and append it to the store.
  /// Returns the new record's ID on success.
  public func createLaunchRecord(
    launches : List.List<LaunchTypes.TokenLaunchRecord>,
    data     : LaunchTypes.LaunchData,
  ) : { #ok : Text; #err : Text } {
    if (data.tokenName == "") return #err("tokenName is required");
    if (data.symbol == "") return #err("symbol is required");
    if (data.selectedChain == "") return #err("selectedChain is required");
    if (data.paymentTxHash == "") return #err("paymentTxHash is required");

    let ts = Time.now();
    let id = makeId(ts, launches.size());
    let record : LaunchTypes.TokenLaunchRecord = {
      id;
      tokenName        = data.tokenName;
      symbol           = data.symbol;
      supply           = data.supply;
      decimals         = data.decimals;
      description      = data.description;
      selectedChain    = data.selectedChain;
      selectedPlatform = data.selectedPlatform;
      launchType       = data.launchType;
      allocationBreakdown = data.allocationBreakdown;
      paymentTxHash    = data.paymentTxHash;
      paymentWallet    = PAYMENT_WALLET;
      var status       = #pending;
      timestamp        = ts;
    };
    launches.add(record);
    #ok(id);
  };

  /// Retrieve a launch record by ID.
  public func getLaunchRecord(
    launches : List.List<LaunchTypes.TokenLaunchRecord>,
    id       : Text,
  ) : ?LaunchTypes.LaunchSnapshot {
    switch (launches.find(func(r : LaunchTypes.TokenLaunchRecord) : Bool { r.id == id })) {
      case null { null };
      case (?r) { ?toSnapshot(r) };
    };
  };

  /// Convert status variant to plain text string.
  func statusText(s : LaunchTypes.LaunchStatus) : Text {
    switch (s) {
      case (#pending) { "pending" };
      case (#paid)    { "paid" };
      case (#failed)  { "failed" };
    };
  };

  /// Convert a mutable record to an immutable snapshot.
  func toSnapshot(r : LaunchTypes.TokenLaunchRecord) : LaunchTypes.LaunchSnapshot {
    {
      id               = r.id;
      tokenName        = r.tokenName;
      symbol           = r.symbol;
      supply           = r.supply;
      decimals         = r.decimals;
      description      = r.description;
      selectedChain    = r.selectedChain;
      selectedPlatform = r.selectedPlatform;
      launchType       = r.launchType;
      allocationBreakdown = r.allocationBreakdown;
      paymentTxHash    = r.paymentTxHash;
      paymentWallet    = r.paymentWallet;
      status           = statusText(r.status);
      timestamp        = r.timestamp;
    };
  };
};
