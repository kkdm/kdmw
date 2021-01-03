---
id: use-env-in-conf
title: Using Environment Variable in docusaurus.config.js
sidebar_label:
slug: /docusaurus/use-env-in-conf
---

## References

- [Using environment variables in React](https://trekinbami.medium.com/using-environment-variables-in-react-6b0a99d83cf5)

## Why

- Avoid hard coding secret value in `docusaurus.config.js` (e.g. google analytics, cloudflare web analytics, etc)
- Interpolate some values dynamically

## How

Use `process.env.YOUR_VARIABLE` in `docusaurus.config.js`

## Example

We can add custom scipts by using `scripts` field in `docusaurus.config.js`. Let's say we'll add some token inside `<head>` like below. 

### Sample `<script>` block

```html
<script defer src=https://example.com/sample.js some-token=THIS_IS_TOKEN></script>
```

### Sample `scripts` field in `docusaurus.config.js`

We don't want to write token string directly inside configuration file, since it's secret information something like below (It can be seen in client browser, although).

```javascript
module.exports = {
  scripts: [
    {
      src: 'https://example.com/sample.js',
      defer: true,
      "some-token": THIS_IS_TOKEN,
    },
  ],
};
```

We can use `process.env.YOUR_ENV` instead of writing secret value directly.

```javascript
module.exports = {
  scripts: [
    {
      src: 'https://example.com/sample.js',
      defer: true,
      "some-token": process.env.YOUR_ENV,
    },
  ],
};
```

## Build or Test locally

After adding proper code in `docusaurus.config.js`, let's build docusaurus, or run docusaurus locally (for testing).

```bash
export YOUR_ENV=THIS_IS_TOKEN
npm run build # or yarn build
```
