# 🤝 Contributing to Yaseenm237 App

Thank you for your interest in contributing to the **Yaseenm237 App**! This document provides guidelines and instructions for contributing.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)

---

## 📜 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of:
- Age, body size, disability
- Ethnicity, sex characteristics, gender identity
- Level of experience, education, socioeconomic status
- Nationality, personal appearance, race, religion
- Sexual identity and orientation

### Our Standards

Examples of behavior that contributes to a positive environment:
- ✅ Using welcoming and inclusive language
- ✅ Being respectful of differing opinions, viewpoints, and experiences
- ✅ Giving and gracefully accepting constructive criticism
- ✅ Focusing on what is best for the community
- ✅ Showing empathy towards other community members

Examples of unacceptable behavior:
- ❌ Trolling, insulting/derogatory comments, and personal or political attacks
- ❌ Public or private harassment
- ❌ Publishing others' private information without explicit permission
- ❌ Other conduct which could reasonably be considered inappropriate

---

## 🚀 Getting Started

### 1. Fork the Repository

Click the "Fork" button on the [repository page](https://github.com/yaseenm237/Yaseenm237-app)

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/Yaseenm237-app.git
cd Yaseenm237-app
```

### 3. Add Upstream Remote

```bash
git remote add upstream https://github.com/yaseenm237/Yaseenm237-app.git
```

### 4. Install Dependencies

```bash
npm install
```

---

## 🔄 Development Workflow

### Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

**Branch naming conventions:**
- `feature/description` - for new features
- `fix/description` - for bug fixes
- `docs/description` - for documentation updates
- `refactor/description` - for code refactoring
- `test/description` - for test additions

### Keep Your Fork Updated

```bash
git fetch upstream
git rebase upstream/main
```

---

## 💬 Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat:** A new feature
- **fix:** A bug fix
- **docs:** Documentation only changes
- **style:** Changes that don't affect code meaning (formatting, etc.)
- **refactor:** Code change that neither fixes a bug nor adds a feature
- **perf:** Code change that improves performance
- **test:** Adding or updating tests
- **chore:** Changes to build process, dependencies, etc.

### Examples

```bash
git commit -m "feat(api): add Gemini API integration"
git commit -m "fix(ui): resolve button styling issue"
git commit -m "docs(readme): update installation instructions"
```

---

## 📤 Pull Request Process

### 1. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 2. Create a Pull Request

1. Go to the [Pull Requests page](https://github.com/yaseenm237/Yaseenm237-app/pulls)
2. Click "New Pull Request"
3. Select your branch
4. Fill in the PR template

### 3. PR Template

```markdown
## Description
Brief description of your changes

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update

## Related Issues
Closes #(issue number)

## Testing Done
Describe the tests you ran

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective
```

### 4. Code Review

- Maintainers will review your PR
- Address any requested changes
- Once approved, your PR will be merged

---

## 🎨 Coding Standards

### TypeScript

- Use **strict** mode
- Add type annotations for all function parameters and returns
- Avoid `any` type when possible

```typescript
// ✅ Good
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ❌ Avoid
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

### React Components

- Use **functional components** with hooks
- Use **descriptive component names**
- Keep components focused and small

```typescript
// ✅ Good
export const CarpenterCard: React.FC<Props> = ({ data }) => {
  return <div className="card">{/* content */}</div>;
};

// ❌ Avoid
export const C = ({ d }) => <div>{d}</div>;
```

### Styling

- Use **Tailwind CSS** classes
- Follow mobile-first approach
- Maintain consistency with existing styles

```jsx
// ✅ Good
<button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg">
  Click me
</button>

// ❌ Avoid
<button style={{ padding: '8px 16px', backgroundColor: 'blue' }}>
  Click me
</button>
```

### File Structure

```
src/
├── components/      # Reusable components
├── pages/          # Page components
├── hooks/          # Custom hooks
├── utils/          # Utility functions
├── types/          # TypeScript types
├── styles/         # Global styles
└── App.tsx         # Main app component
```

---

## 🧪 Testing

### Run Tests

```bash
npm run test
```

### Run Linter

```bash
npm run lint
```

### Check TypeScript Types

```bash
npm run lint
```

### Before Submitting

- ✅ Run `npm run lint` - ensure no TypeScript errors
- ✅ Run `npm run build` - ensure build succeeds
- ✅ Test your changes locally
- ✅ Check for console errors and warnings

---

## 🐛 Reporting Bugs

### How to Report

1. **Search** existing issues first
2. **Create** a new issue with:

```markdown
### Description
Brief description of the bug

### Steps to Reproduce
1. Go to...
2. Click on...
3. See error...

### Expected Behavior
What should happen

### Actual Behavior
What actually happened

### Environment
- OS: [e.g. Windows, macOS]
- Browser: [e.g. Chrome, Firefox]
- Node.js version: [e.g. 18.0.0]

### Screenshots/Logs
Add relevant screenshots or error logs
```

---

## 💡 Suggesting Enhancements

### How to Suggest

1. **Search** existing feature requests first
2. **Create** a new issue with:

```markdown
### Description
Clear and concise description of the feature

### Use Case
Why would this feature be useful?

### Proposed Solution
How should this feature work?

### Alternatives Considered
Any alternative approaches?

### Additional Context
Any other context or screenshots?
```

---

## 🙏 Thank You!

Your contributions make this project better. Thank you for taking the time to contribute!

---

<div align="center">

**Happy Coding! 🚀**

</div>