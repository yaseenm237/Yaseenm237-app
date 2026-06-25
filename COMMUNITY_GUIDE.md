# Community Guidelines & Issue Reporting

## 🤝 Community Support

यह एक **open-source project** है। अगर आप issue पाते हैं या improvements सुझाना चाहते हैं, तो कृपया contribute करें।

---

## 🐛 Bug Report कैसे करें

### Step 1: GitHub Issues खोलें
https://github.com/yaseenm237/Yaseenm237-app/issues

### Step 2: Issue Template भरें

```markdown
## Bug Description
क्या problem है? संक्षिप्त विवरण दें।

## Steps to Reproduce
1. यह करें
2. फिर यह करें
3. यह होना चाहिए था

## Expected Behavior
क्या होना चाहिए था?

## Actual Behavior
असल में क्या हुआ?

## Environment
- OS: Windows/macOS/Linux
- Browser: Chrome/Firefox/Safari
- App Version: x.x.x
- Node.js: v16+

## Screenshots/Logs
अगर possible हो तो screenshot या error log attach करें

## Reproducibility
- [ ] Every time
- [ ] Sometimes
- [ ] Once (random)

## Additional Context
कोई और detail?
```

---

## 💡 Feature Request कैसे करें

### Step 1: Discussions खोलें
https://github.com/yaseenm237/Yaseenm237-app/discussions

### Step 2: Feature Template भरें

```markdown
## Feature Title
सारांश में क्या चाहिए?

## Problem Statement
यह feature क्यों ज़रूरी है?

## Proposed Solution
आप यह कैसे implement करेंगे?

## Use Case Example
किस तरह से use होगा?

## Alternatives
अन्य विकल्प क्या हैं?

## Additional Context
और कोई context?
```

---

## 🔧 Code Contribution

### Fork करें और Pull Request दें

```bash
# 1. Repository fork करें (GitHub पर)

# 2. Clone करें
git clone https://github.com/YOUR_USERNAME/Yaseenm237-app.git
cd Yaseenm237-app

# 3. Feature branch बनाएं
git checkout -b feature/your-feature-name

# 4. Changes कर��ं
# अपने improvements करें

# 5. Test करें
npm run lint
npm run build

# 6. Commit करें
git commit -m "feat: add your feature description"

# 7. Push करें
git push origin feature/your-feature-name

# 8. GitHub पर Pull Request खोलें
```

---

## 📋 Algorithm Improvement Requests

### अगर आप algorithm में सुधार देखते हैं:

```markdown
## Algorithm: [Algorithm Name]
कौन सा algorithm?

## Current Behavior
अभी कैसे काम करता है?

## Problem
क्या problem है?

## Proposed Improvement
कैसे improve कर सकते हैं?

## Performance Impact
Performance पर क्या असर होगा?

## Example
कोई concrete example दें

## Code Snippet
अगर possible हो तो code दिखाएं
```

---

## 🌍 Language/Translation Issues

### नई language add करने के लिए:

```typescript
// src/App.tsx में TRANSLATIONS object को update करें

const TRANSLATIONS = {
  English: { /* ... */ },
  Hindi: { /* ... */ },
  // Add new language:
  Spanish: {
    title: "Optimizador de Carpintería Inteligente",
    // ... all translations
  }
};
```

फिर PR के साथ complete translations दें।

---

## 📊 Performance Issues

अगर slow performance का issue है:

```markdown
## Performance Issue

### Metrics
- Current speed: X seconds
- Expected speed: Y seconds
- Improvement needed: X-Y seconds

### When Does It Happen?
- [ ] With X parts
- [ ] With Y algorithm
- [ ] On Z device/browser

### Profile Data
Browser DevTools से profile करें:
1. Chrome DevTools खोलें (F12)
2. Performance tab जाएं
3. Recording शुरू करें
4. Action perform करें
5. Recording रोकें
6. Screenshot attach करें
```

---

## 💻 Development Setup

Contributors के लिए:

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Lint code
npm run lint

# Build for production
npm run build

# Run tests (जब add हो जाएंगे)
npm run test
```

---

## 🎨 Code Style

### TypeScript Rules
- Use strict mode
- Type everything properly
- No `any` type (unless absolutely necessary)

### React Components
- Functional components only
- Use hooks
- Proper TypeScript interfaces

### Naming Convention
```typescript
// Components
export const SheetSettingsPanel: React.FC<Props> = () => {}

// Functions
const calculateUtilization = (area: number): number => {}

// Variables
const sheetDimensions = { width: 96, height: 48 }

// Constants
const DEFAULT_KERF_MM = 3.0
```

### CSS/Tailwind
- Use Tailwind classes
- Avoid inline styles
- Mobile-first approach

---

## 📝 Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types:
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation
- **style**: Code style (formatting)
- **refactor**: Code refactoring
- **perf**: Performance improvement
- **test**: Test addition/updates
- **chore**: Build/config changes

### Examples:
```bash
git commit -m "feat(packing): add new guillotine algorithm"
git commit -m "fix(ui): resolve button styling issue"
git commit -m "docs: update README with APK setup"
```

---

## 🔍 Reporting Algorithm Issues

### Step 1: Identify the Problem

```
Is it:
- [ ] Wrong calculation?
- [ ] Suboptimal packing?
- [ ] Performance issue?
- [ ] Logic error?
```

### Step 2: Create Test Case

```json
{
  "sheetSettings": {
    "sheetL": 96,
    "sheetW": 48,
    "bladeTh": 3,
    "trimMargin": 10,
    "edgeTh": 2
  },
  "parts": [
    {"length": 84, "width": 22, "quantity": 2},
    {"length": 34.5, "width": 21.5, "quantity": 4}
  ],
  "algorithm": "Guillotine",
  "expectedUtilization": 85,
  "actualUtilization": 72,
  "problem": "Utilization is lower than expected"
}
```

### Step 3: Submit with Logs

```bash
# Enable debug logs
# File में add करें logging statements
// src/utils/packer.ts
console.log('Algorithm: Guillotine', { sheets, utilization, waste })
```

---

## ✅ Pull Request Checklist

PR submit करने से पहले check करें:

- [ ] Code lint pass करता है (`npm run lint`)
- [ ] Build successful है (`npm run build`)
- [ ] TypeScript errors नहीं हैं
- [ ] Components properly typed हैं
- [ ] Comments/documentation added है
- [ ] Commit messages clear हैं
- [ ] No console errors/warnings
- [ ] Tested on multiple browsers (if applicable)
- [ ] Mobile responsive है (if UI change)

---

## 🎯 Priority Issues

### High Priority
- Security vulnerabilities
- Critical bugs (calculation errors)
- Performance issues
- Breaking changes

### Medium Priority
- UI/UX improvements
- Algorithm optimizations
- Documentation updates

### Low Priority
- Code style
- Minor UI tweaks
- Developer experience

---

## 📞 Contact & Support

### Questions?
- Create Discussion: https://github.com/yaseenm237/Yaseenm237-app/discussions
- Email: yaseenm237@gmail.com
- GitHub: [@yaseenm237](https://github.com/yaseenm237)

---

## 🙏 Thank You!

यह project community efforts से ही बेहतर बन सकता है। आपके contribution के लिए धन्यवाद! 

**Happy Contributing! 🚀**

