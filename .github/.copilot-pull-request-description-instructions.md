# Pull Request Description Guidelines

Title Format: `<type>(<scope>): <description>`

- `<type>`: One of `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
- `<scope>`: Required. Affected module or feature (e.g., `auth`, `api`).
- `<description>`: Brief and precise.

## Examples

- `feat(auth): add OAuth2 login`
- `fix(db): resolve transaction deadlock`
- `chore(ci): update GitHub Actions`

---

## Description

What Explain what changed.

Why Justify the change.

Example: What: Added OAuth2 login. Why: Allows third-party authentication.

---

## Breaking Changes (If Any)

Use `BREAKING CHANGE: <description>`.

Example: `BREAKING CHANGE: API response format changed to JSON.`

---

## Testing

Describe how this was tested.

Example:

- Unit tests added for OAuth2.
- Manual login tests with Google and Facebook.

---

## Additional Context (If Applicable)

Include deployment steps, dependencies, security notes, or issue references (Fixes #X).

Example: Requires `ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(255);`.

---

#### Strict Best Practices

- Keep it technical and concise.
- Include deployment steps if needed.
- No vague or generic descriptions.
