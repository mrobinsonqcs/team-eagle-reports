-- Phase 1: enums

create extension if not exists pgcrypto;

create type public.app_role as enum ('division', 'admin', 'dealer');

create type public.newsletter_status as enum ('draft', 'ready', 'sent', 'skipped');
