import LaunchTypes "../types/launch";
import LaunchLib "../lib/launch";
import List "mo:core/List";

mixin (
  launches : List.List<LaunchTypes.TokenLaunchRecord>,
) {

  /// Create a new launch record. Returns the record ID on success.
  public func createLaunchRecord(data : LaunchTypes.LaunchData) : async { #ok : Text; #err : Text } {
    LaunchLib.createLaunchRecord(launches, data);
  };

  /// Retrieve a launch record by ID. Returns null if not found.
  public query func getLaunchRecord(id : Text) : async ?LaunchTypes.LaunchSnapshot {
    LaunchLib.getLaunchRecord(launches, id);
  };
};
