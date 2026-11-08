import React from 'react';
import {appUrl} from './app-url';
import {operatorName} from './site-operator';
export function Privacy(){return <main className="learn-page privacy-page"><h1>運営者・プライバシー</h1><p>最終更新日：2026年11月8日</p>
<section><h2>運営者と連絡先</h2><p>{operatorName}</p><p>本サイトの運営、掲載内容、個人情報の取り扱いに関するご相談は、<a href={appUrl('/contact/')}>お問い合わせフォーム</a>からご連絡ください。</p></section>
<section><h2>掲載する健診データ</h2><p>本サイトは公表された集計データを掲載しています。個人別の健診結果を入力・登録するサービスではありません。</p></section>
<section><h2>お問い合わせ情報と外部送信</h2><p>フォームで入力した氏名（任意）、メールアドレス、お問い合わせ種別、お問い合わせ内容は、お問い合わせへの対応のために利用します。</p><p>送信先は外部サービスのWeb3Forms（Web3Creative）です。送信ボタンを押すと、これらの情報がHTTPS通信でWeb3Formsに送られます。Web3Formsによる処理・保存等は、<a href="https://web3forms.com/privacy" target="_blank" rel="noreferrer">同社のプライバシーポリシー</a>をご確認ください。</p><p>お問い合わせには、個人の健診結果や第三者の個人情報を記載しないでください。送信済みの情報についてのご相談も、お問い合わせフォームで受け付けます。</p></section>
<section><h2>アクセス解析</h2><p>利用状況の把握とサイト改善のため、Googleが提供するGoogleアナリティクス4（測定ID：G-QJCHVX2XEW）を使用しています。閲覧ページやブラウザー・端末に関する情報等がGoogleに送信され、Cookieが使用されることがあります。</p><p>本サイトの実装では、氏名・メールアドレス・お問い合わせ本文を解析の送信項目に含めていません。また、ページURLから検索条件とページ内の位置を除き、参照元URLも除いて送信しています。Googleシグナルと広告のパーソナライズ用の設定は無効にしています。</p><p>Googleによる取り扱いは<a href="https://policies.google.com/privacy?hl=ja" target="_blank" rel="noreferrer">Googleのプライバシーポリシー</a>、Cookieについては<a href="https://support.google.com/analytics/answer/11397207?hl=ja" target="_blank" rel="noreferrer">Google公式の説明</a>をご確認ください。</p><p>Cookieの使用はブラウザーの設定で制限できます。ただし、Cookieの制限だけですべての外部通信が停止するとは限りません。対応するPCブラウザーでは、<a href="https://tools.google.com/dlpage/gaoptout?hl=ja" target="_blank" rel="noreferrer">Googleアナリティクスのオプトアウトアドオン</a>も利用できます。</p></section>
<section><h2>サイトの配信</h2><p>ホスティングにはGitHub Pagesを利用しています。GitHub側での情報の取り扱いは<a href="https://docs.github.com/ja/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noreferrer">GitHubのプライバシーステートメント</a>をご確認ください。</p></section>
</main>;}
