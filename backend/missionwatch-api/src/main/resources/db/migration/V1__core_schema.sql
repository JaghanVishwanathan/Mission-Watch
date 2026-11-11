-- MissionWatch core schema (SRS §9), MySQL 9.7 LTS. Later phases add users, watchlists,
-- notifications, model versions and predictions in new migrations.
-- All times are UTC (DATETIME(6); the API connects with connectionTimeZone=UTC).

create table provider (
    id           bigint       not null auto_increment primary key,
    external_id  varchar(64)  not null,
    name         varchar(255) not null,
    abbrev       varchar(64),
    country_code varchar(16),
    type         varchar(32),
    constraint provider_external_id_uk unique (external_id)
);

create table rocket (
    id          bigint       not null auto_increment primary key,
    external_id varchar(64)  not null,
    name        varchar(255) not null,
    family      varchar(255),
    variant     varchar(255),
    provider_id bigint,
    constraint rocket_external_id_uk unique (external_id),
    constraint rocket_provider_fk foreign key (provider_id) references provider (id)
);

create table launch_site (
    id           bigint       not null auto_increment primary key,
    external_id  varchar(64)  not null,
    name         varchar(255) not null,
    location     varchar(255),
    country_code varchar(16),
    latitude     double,
    longitude    double,
    constraint launch_site_external_id_uk unique (external_id)
);

create table launch (
    id                bigint       not null auto_increment primary key,
    external_id       varchar(64)  not null,
    name              varchar(255) not null,
    mission_name      varchar(255) not null,
    scheduled_time    datetime(6)  not null,
    status            varchar(32)  not null,
    provider_id       bigint       not null,
    rocket_id         bigint       not null,
    site_id           bigint       not null,
    detail_level      varchar(16)  not null,
    source_updated_at datetime(6),
    refreshed_at      datetime(6)  not null,
    -- The normalised launch as served by the API (frontend Launch model).
    document          json         not null,
    -- The latest source record, kept for traceability and re-mapping.
    source_payload    json         not null,
    constraint launch_external_id_uk unique (external_id),
    constraint launch_provider_fk foreign key (provider_id) references provider (id),
    constraint launch_rocket_fk foreign key (rocket_id) references rocket (id),
    constraint launch_site_fk foreign key (site_id) references launch_site (id),
    index launch_scheduled_time_idx (scheduled_time),
    index launch_status_idx (status)
);

-- One row per observed change of a launch's schedule or status (FR-07).
create table launch_snapshot (
    id                bigint       not null auto_increment primary key,
    launch_id         bigint       not null,
    observed_at       datetime(6)  not null,
    scheduled_time    datetime(6)  not null,
    status            varchar(32)  not null,
    source            varchar(64)  not null,
    source_updated_at datetime(6),
    constraint launch_snapshot_launch_fk foreign key (launch_id) references launch (id) on delete cascade,
    index launch_snapshot_launch_idx (launch_id, observed_at)
);

-- Every refresh attempt, successful or not. Feeds data-freshness metadata.
create table data_refresh (
    id              bigint        not null auto_increment primary key,
    source          varchar(64)   not null,
    job             varchar(64)   not null,
    started_at      datetime(6)   not null,
    finished_at     datetime(6)   not null,
    succeeded       boolean       not null,
    records_stored  int           not null,
    records_skipped int           not null,
    message         varchar(1000),
    index data_refresh_source_idx (source, finished_at)
);
