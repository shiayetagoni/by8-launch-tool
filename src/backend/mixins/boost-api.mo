import Types "../types/boost";
import BoostLib "../lib/boost";
import TelegramLib "../lib/telegram";
import List "mo:core/List";
import Set "mo:core/Set";
import OutCall "mo:caffeineai-http-outcalls/outcall";

mixin (
  boosts : List.List<Types.BoostRecord>,
  uniqueMints : Set.Set<Text>,
  transform : OutCall.Transform,
  chatIdStore : List.List<Int>,
) {

  // ── Internal helper ────────────────────────────────────────────────────────

  // Send a Telegram alert using the stored chat ID (best-effort, non-blocking).
  func sendAlert(text : Text) : async () {
    let chatId = TelegramLib.effectiveChatId(chatIdStore);
    if (chatId == 0) return; // no chat ID yet — skip silently
    ignore await TelegramLib.sendTelegramMessage(chatId, text, transform);
  };

  // ── Boost submission ───────────────────────────────────────────────────────

  /// Record a boost without a wallet address (backward-compatible).
  public func recordBoost(
    mint : Text,
    tier : Float,
    txHash : Text,
    timestamp : Int,
  ) : async { #ok; #err : Text } {
    switch (BoostLib.recordBoost(boosts, uniqueMints, mint, tier, txHash, timestamp, "")) {
      case (#err(e)) { #err(e) };
      case (#ok(record)) {
        let msg = TelegramLib.buildBoostMessage(record);
        ignore await sendAlert(msg);
        #ok;
      };
    };
  };

  /// Record a boost with an associated wallet address.
  public func recordBoostWithWallet(
    mint : Text,
    tier : Float,
    txHash : Text,
    timestamp : Int,
    wallet : Text,
  ) : async { #ok; #err : Text } {
    switch (BoostLib.recordBoost(boosts, uniqueMints, mint, tier, txHash, timestamp, wallet)) {
      case (#err(e)) { #err(e) };
      case (#ok(record)) {
        let msg = TelegramLib.buildBoostMessage(record);
        ignore await sendAlert(msg);
        #ok;
      };
    };
  };

  // ── Analytics ──────────────────────────────────────────────────────────────

  public query func getAnalytics() : async Types.AnalyticsResult {
    BoostLib.getAnalytics(boosts, uniqueMints);
  };

  // ── Leaderboard ────────────────────────────────────────────────────────────

  public query func getTopBoosters(limit : Nat) : async [Types.LeaderboardEntry] {
    BoostLib.getTopBoosters(boosts, limit);
  };

  public query func getTopBoostersByPeriod(limit : Nat, periodDays : Nat) : async [Types.LeaderboardEntry] {
    BoostLib.getTopBoostersByPeriod(boosts, limit, periodDays);
  };

  public query func getWalletStats(wallet : Text) : async ?Types.WalletStats {
    BoostLib.getWalletStats(boosts, wallet);
  };

  // ── Recent boosts ──────────────────────────────────────────────────────────

  /// Return the N most recent boost records.
  public query func getRecentBoosts(limit : Nat) : async [Types.BoostRecord] {
    BoostLib.recentBoosts(boosts, limit);
  };

  // ── Token history ──────────────────────────────────────────────────────────

  public query func getTokenHistory(mint : Text) : async [Types.BoostRecord] {
    BoostLib.getTokenHistory(boosts, mint);
  };

  // ── Seed data ──────────────────────────────────────────────────────────────

  public func initSeedData() : async () {
    BoostLib.seedData(boosts, uniqueMints);
  };
};
