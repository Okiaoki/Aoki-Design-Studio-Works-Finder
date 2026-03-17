# Aoki Design Studio Works Finder

検索・絞り込み・比較・相談導線までを一連で見せる、掲載用アーカイブ UI の検証 / 公開リポジトリです。

## 概要

- 作品名: Aoki Design Studio Works Finder
- 一文要約: 制作実績を検索・比較・相談準備までつなげて見せる、掲載用アーカイブ UI

## 公開ページ

- Public URL: https://okiaoki.github.io/Aoki-Design-Studio-Works-Finder/
- Case Study URL: https://okiaoki.github.io/Aoki-Design-Studio-Works-Finder/projects/works-finder/

## このリポジトリで扱うもの

- Works Finder 本体の公開ページ
- Works Finder 自体の case study
- 一部作品の個別詳細ページ
- 今後の掲載運用ルールと、メインポートフォリオへ転記しやすい文言整理

注意:
この repo にメインポートフォリオ本体は含まれていません。ここでは Works Finder 単体で役割を説明できる状態を整えています。

## 主な機能

- キーワード検索
- 絞り込み
- 並び替え
- 比較バー / 比較パネル
- 詳細モーダル
- URL 同期
- localStorage による状態保持
- 相談導線の下書き生成
- 個別詳細ページへの接続

## ディレクトリ構成

- `index.html`
  公開中の Works Finder 本体です。
- `assets/`
  共通 CSS、画像、meta 画像などを置いています。
- `data/works.js`
  掲載作品データを管理しています。
- `js/`
  状態管理、URL 同期、描画、保存、相談導線などのロジックです。
- `projects/`
  Works Finder の case study と、個別作品の詳細ページです。
- `docs/`
  アーカイブ運用ルールや、ポートフォリオ上の役割整理をまとめています。

## 補足

- Vanilla HTML / CSS / JavaScript のまま段階的に整備しています。
- 検索・絞り込み・並び替え・比較・モーダル・URL 同期・localStorage・相談導線は維持対象です。
- 実在クライアント実績のように誤認される表現は避け、掲載用デモ / 自主制作の文脈を明示しています。

## 今後の展開

次の段階では、見た目と要件を大きく変えずに、React + TypeScript での再構築を予定しています。
この repo では、その前段として現行版の UI / 情報設計 / 役割定義を崩さず整理し続けます。
