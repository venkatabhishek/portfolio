# Portfolio

# Problem Statement 

A modern investor has many assets distributed across various banks, brokers, etc: This clearly
translates into greater dependency on the investor to in turn manage and understand each interface 
and assets separetly. This RFC proposes an app to centralize basic tasks associated with financial management including viewing balances, transactions and more.

# Product Requierements

- Users should be able sign up for the app using social logins (or via db if easier)
- Users should be able to connect their banks/brokers, etc via plaid: The app should maintain a list of these connections and allow the user to disconnect/connect more at any time
- The app should be a dashboard with several tabs:
    - Dashboard: All Acounts in a card grid + quick perforamnce summary at top (total $, trend etc)
    - Manage Accounts: self-explanatory
    - Transactions: See table and allow sorting/filtering
    - Settings: user facing configurable settings for viewing, advanced, etc
- The app should maintain the latest data according to only the latest connected accounts: there should be a user way to trigger a hard refresh from server 
- The app should be scalable in case we extend it for write operations or executing trades

