# セキュリティポリシー / Security Policy

## 脆弱性の報告 / Reporting a Vulnerability

セキュリティ上の脆弱性を発見した場合は、**公開 Issue は開かず**、以下のいずれかで非公開に報告してください。

If you discover a security vulnerability, please report it **privately** (do not open a public issue):

- **GitHub のプライベートセキュリティアドバイザリ**  
  Repository → Security → Advisories → "Report a vulnerability" から報告できます。
- **メール**  
  運用元が別途連絡先を公開している場合は、その窓口を使用してください。

報告いただいた内容は、修正の検討・対応方針の共有に利用します。修正が完了するまで、報告内容の非公開を原則とします。

We use reported information to evaluate and address the issue. We aim to keep reports confidential until a fix is in place.

## 対象 / Scope

- このリポジトリ（thegentlelight-web）の**フロントエンドコード**で再現できる脆弱性
- XSS、認証バイパス、機密情報の露出、依存関係の既知の脆弱性など

**対象外**: 当リポジトリに含まれないバックエンド API・インフラ・第三者のサービスに対する攻撃手法のみの報告は、本ポリシーの対象外です。可能であれば該当サービス提供元のセキュリティ窓口へご連絡ください。

## 謝辞 / Acknowledgments

協力的な開示に基づき脆弱性を報告してくださった方には、修正公開後に謝辞（匿名可）を掲載する場合があります。希望されない場合はその旨お知らせください。

We may acknowledge reporters (anonymously if preferred) after a fix is released. Please let us know if you prefer not to be credited.
