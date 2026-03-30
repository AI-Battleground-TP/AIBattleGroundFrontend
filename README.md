
```bash
conda create -n blind-test-fe -c conda-forge "nodejs>=20,<21" npm
conda activate blind-test-fe
```


```bash
cd blind-test-frontend
npm install
```

```bash
npm ci
```

```bash
npm run dev
```

Üretim derlemesi:

```bash
npm run build
```

Derlemeyi yerel olarak önizleme:

```bash
npm run preview
```

