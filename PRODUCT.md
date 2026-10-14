# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite + TypeScript single-page app in its own repository, talking to the Spring Boot backend repository at `/api/v1` with JWT bearer tokens. Chosen by the user.

## Users

Staff of a chain of about 9 restaurants, each using the screen that matches their job:

- **Cashiers and waiters** at a branch, on a tablet at the counter or carried to tables: open orders for a table or takeaway, add or drop dishes, apply promotion codes and loyalty points, take cash and give change.
- **Chefs**, on a large wall screen or tablet in the kitchen: see dishes waiting in order of arrival, mark them cooking, ready, served, and mark a dish sold out when the kitchen runs out.
- **Branch managers**, on a laptop and sometimes a phone: staff accounts, shifts and timesheets, stock and purchase orders, branch prices.
- **The chain owner**, on a laptop and sometimes a phone: every branch at once (orders, cash revenue today, kitchen load), the chain menu, promotions and VAT.

## Product Purpose

Run the day-to-day of a restaurant chain from one system, and keep service flowing at peak hours: guests already seated are always served while takeaway and delivery pause automatically when a kitchen is full. Success is a cashier finishing an order in seconds during a rush, a kitchen that always knows what to cook next, and an owner who sees which branch is overloaded without phoning anyone.

## Positioning

Built around the dinner rush: each branch's kitchen load is measured from real cooking speed, and the system protects seated guests by pausing takeaway when a kitchen is full, instead of letting every channel pile onto the same stove.

## Operating Context

- A branch has tables in areas (e.g. Tầng 1, Tầng 2); a dine-in order belongs to a table, takeaway and delivery orders do not.
- Order flow: order taken → dishes appear on the kitchen screen first come first served → cook starts (ingredients deducted by recipe) → ready → served → cash payment → order completed (table freed, loyalty points earned).
- Money: cash for every order taken by staff; the cashier enters the cash received and the system computes the change. Guests ordering takeaway on the website pay first: cash at the counter, or a bank transfer to the chain's QR image (set by the owner) that the cashier confirms. The kitchen only sees a web takeaway once it is paid. No bank or card integration.
- Pricing: dish prices come from the chain menu or the branch's own price; subtotal − promotion − points, then VAT (8% by default, set by the owner).
- Roles: ADMIN (chain owner), BRANCH_MANAGER, CASHIER, WAITER, CHEF, WAREHOUSE. Staff only see and act on their own branch; the owner sees all branches.
- Peak hours: busy, noisy, hands often wet or full; screens are glanced at, not studied.

## Capabilities and Constraints

- Backend API already exists and is the source of truth (96 endpoints, documented in Swagger and in the backend repository at `docs/postman/Savoris.postman_collection.json`).
- UI language: Vietnamese. Currency: VND, no decimals.
- Not in scope: delivery-platform integration (planned later with a third party), online card/bank payments.
- Kitchen screen has no push channel yet; it refreshes by polling.

## Brand Commitments

Name: Savoris. No logo, slogan or brand colours exist yet; do not invent a logo or tagline.

## Evidence on Hand

An empty database is seeded with only the 9 branches (CN01–CN09) and one account per role: admin, quanly, thungan, phucvu, daubep, kho, shared password 12345 (shown as quick-login only on development builds). Dishes, areas, tables, staff and stock are entered by the restaurant itself; there is no demo data. No real customers, testimonials or photos exist; do not fabricate them. The guest home and login use royalty-free Unsplash food photos as placeholders until the restaurant's own photos replace them; dish photos come from each dish's image link.

## Product Principles

1. The rush comes first: every screen used during service must work at a glance and in as few taps as possible.
2. Guests at the table are never sacrificed for takeaway.
3. Each role sees its own job, not the whole system.
4. Money is exact: totals, VAT and change always match what the backend computed.
5. Nothing destructive happens by accident: cancelling, refunding and price changes are explicit and limited by role.

## Accessibility & Inclusion

Readable from a distance on the kitchen screen; large touch targets on tablets; status must never be conveyed by colour alone (kitchen and load states also carry text).
