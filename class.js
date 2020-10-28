class SavedStatementFile {
  constructor(ctx, date=null, username=null) {
    date     = date     || ctx.session.date     || ctx.query.date;
    username = username || ctx.session.username || ctx.query.username;

    this.date = date;
    this.username = username;
  }

  read() {
    return [this.date, this.username];
  }
}

exports.SavedStatementFile = SavedStatementFile;