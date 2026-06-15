module {
  public type TelegramSendResult = { #ok; #err : Text };

  public type TelegramStatus = {
    connected    : Bool;
    chatId       : ?Int;
    lastResponse : Text;
    errorLog     : [Text];
  };
};

