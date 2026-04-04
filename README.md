Tracking of Funds within Bank for Fraud Detection
Develop an intelligent Fund Flow Tracking system that maps and visualises the end-to-end movement of funds within the bank across accounts, products, branches, and channels. The system should use graph analytics and machine learning to identify suspicious fund flow patterns such as rapid layering through multiple accounts, circular transactions (round-tripping), structuring below reporting thresholds, sudden activation of dormant accounts for high-value transfers, and mismatches between declared customer profiles and actual fund movement behaviour. The solution should enable investigators to trace the complete journey of funds and generate evidence packages for reporting to the Financial Intelligence Unit (FIU).


 Our solution is an AI-Powered Graph Intelligence Platform that integrates with a bank's Core Banking System (CBS) to ingest real-time transaction data. It converts flat tabular data into a Dynamic Knowledge Graph, where accounts are "Nodes" and transactions are "Edges." By applying Graph Neural Networks (GNNs) and Pathfinding Algorithms, the system automatically maps the "DNA" of every rupee as it moves across branches, digital channels, and product lines (e.g., from a Savings Account to a Credit Card payment).


There is some mock data alredy in git you can drag and drop to the website to see live conversion of csv to 3d graph.




# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
