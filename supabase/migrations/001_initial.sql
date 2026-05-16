-- stocks テーブル
create table stocks (
  code            varchar(10)   primary key,
  name            varchar(100)  not null,
  market          varchar(20),
  category        varchar(50),
  stock_price     integer,
  min_investment  integer,
  updated_at      timestamp     default now()
);

-- yuutai テーブル
create table yuutai (
  id              uuid          primary key default gen_random_uuid(),
  code            varchar(10)   references stocks(code),
  summary         varchar(200),
  detail          text,
  kakutei_month   varchar(20),
  kakutei_date    date,
  kenri_date      date,
  yuutai_value    integer,
  yuutai_yield    decimal(5,2),
  updated_at      timestamp     default now()
);

-- financials テーブル
create table financials (
  id                  uuid      primary key default gen_random_uuid(),
  code                varchar(10) references stocks(code),
  year                integer,
  operating_profit    bigint,
  net_profit          bigint,
  equity_ratio        decimal(5,2),
  operating_cf        bigint,
  dividend_yield      decimal(5,2),
  yuutai_cost_ratio   decimal(5,2),
  updated_at          timestamp default now()
);

-- risk_scores テーブル
create table risk_scores (
  id              uuid      primary key default gen_random_uuid(),
  code            varchar(10) references stocks(code),
  risk_score      integer,
  score_breakdown jsonb,
  calculated_at   timestamp default now()
);

-- price_history テーブル
create table price_history (
  id              uuid      primary key default gen_random_uuid(),
  code            varchar(10) references stocks(code),
  kakutei_date    date,
  drop_rate       decimal(5,2),
  recovery_1w     decimal(5,2),
  recovery_1m     decimal(5,2),
  recovery_3m     decimal(5,2),
  recovery_days   integer
);

-- watchlist テーブル
create table watchlist (
  id        uuid      primary key default gen_random_uuid(),
  code      varchar(10) references stocks(code),
  added_at  timestamp default now(),
  memo      text
);
