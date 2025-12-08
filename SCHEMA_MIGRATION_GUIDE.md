# Guide de Migration de Schéma

## Qu'est-ce qui se passe quand on modifie un schéma avec des entrées existantes ?

Lorsque vous modifiez le schéma d'une collection qui a déjà des entrées, voici ce qui se passe :

### 1. **Ajout de nouveaux champs**
✅ **Sûr** - Les entrées existantes recevront des valeurs vides pour les nouveaux champs.

```javascript
// Ancien schéma
{ title: "Mon article", description: "..." }

// Nouveau schéma ajoute "author"
{ title: "Mon article", description: "...", author: "" }
```

**Action recommandée** :
- Éditez chaque entrée pour remplir les nouveaux champs
- Ou définissez des valeurs par défaut dans votre code frontend

### 2. **Suppression de champs**
⚠️ **Attention** - Les données des champs supprimés restent dans la base de données mais ne seront plus visibles/éditables.

```javascript
// Ancien schéma avec "subtitle"
{ title: "Mon article", subtitle: "Sous-titre", description: "..." }

// Nouveau schéma sans "subtitle"
{ title: "Mon article", description: "..." }
// Le "subtitle" existe toujours dans la DB mais n'est plus accessible
```

**Action recommandée** :
- Avant de supprimer un champ, vérifiez qu'il n'est plus utilisé dans votre frontend
- Exportez les données si vous pourriez en avoir besoin plus tard

### 3. **Renommage de champs (changement de clé)**
❌ **Destructif** - C'est équivalent à supprimer l'ancien champ et créer un nouveau.

```javascript
// Ancien schéma
{ title: "Mon article", body: "Contenu..." }

// Renommer "body" en "content"
{ title: "Mon article", content: "" }
// Les données de "body" sont perdues pour l'édition
```

**Action recommandée** :
- **Option 1 (Manuel)** : Créez le nouveau champ, copiez les données manuellement, puis supprimez l'ancien
- **Option 2 (Script)** : Créez un script de migration pour renommer les clés dans toutes les entrées

### 4. **Changement de type de champ**
⚠️ **Attention** - Les données restent mais peuvent être invalides pour le nouveau type.

```javascript
// Ancien type: "number"
{ price: 42 }

// Nouveau type: "text"
{ price: "42" } // Fonctionne généralement
```

**Action recommandée** :
- Testez avec quelques entrées avant de changer pour tout
- Les conversions number → text sont généralement sûres
- Les conversions text → number peuvent échouer si le texte n'est pas numérique

## Stratégies de Migration Recommandées

### Stratégie 1 : Migration Progressive (Recommandée)
1. **Ajoutez** le nouveau champ au schéma
2. **Éditez** progressivement les entrées existantes pour remplir le nouveau champ
3. Une fois toutes les entrées migrées, **supprimez** l'ancien champ si nécessaire

### Stratégie 2 : Script de Migration (Pour gros volumes)
```javascript
// Exemple de script de migration
// /scripts/migrate-field.js
import { db } from '../src/lib/db';

async function migrateField() {
  const entries = await db.execute('SELECT * FROM entries WHERE collection_id = ?', [collectionId]);

  for (const entry of entries.rows) {
    const data = JSON.parse(entry.data);

    // Exemple: Renommer un champ
    data.newFieldName = data.oldFieldName;
    delete data.oldFieldName;

    await db.execute(
      'UPDATE entries SET data = ? WHERE id = ?',
      [JSON.stringify(data), entry.id]
    );
  }
}

migrateField();
```

### Stratégie 3 : Valeurs par Défaut dans le Frontend
```typescript
// utils/content.ts
export function getEntry(entry: Entry) {
  return {
    ...entry.data,
    // Valeurs par défaut pour les nouveaux champs
    author: entry.data.author || 'Anonyme',
    publishedAt: entry.data.publishedAt || new Date().toISOString()
  };
}
```

## Checklist Avant de Modifier un Schéma

- [ ] **Backup** : Exportez vos données avant toute modification majeure
- [ ] **Test** : Testez la modification sur une entrée de test d'abord
- [ ] **Frontend** : Vérifiez que votre code frontend gère les champs manquants
- [ ] **Communication** : Si vous travaillez en équipe, prévenez les autres
- [ ] **Documentation** : Notez les changements de schéma pour référence future

## Commandes Utiles

### Exporter toutes les entrées d'une collection
```bash
# Via l'API
curl http://localhost:4321/api/entries?collectionId=1 > backup-collection-1.json
```

### Voir les données brutes d'une entrée
```sql
SELECT id, slug, data FROM entries WHERE collection_id = 1;
```

## Bonnes Pratiques

1. **Évitez les suppressions de champs** si possible - gardez-les mais cachez-les dans l'UI
2. **Préférez l'ajout de nouveaux champs** plutôt que la modification de champs existants
3. **Testez toujours** sur un environnement de développement d'abord
4. **Documentez vos changements** dans ce fichier ou un changelog
5. **Communiquez** avec votre équipe avant des changements majeurs

## Questions Fréquentes

**Q: Puis-je annuler une modification de schéma ?**
R: Oui, vous pouvez revenir en arrière en rééditant le schéma. Les données non visibles restent dans la base de données.

**Q: Les données sont-elles perdues quand je supprime un champ ?**
R: Non, elles restent dans la base de données mais ne sont plus accessibles via l'interface d'édition.

**Q: Que se passe-t-il si j'ai des entrées avec l'ancien schéma et de nouvelles avec le nouveau ?**
R: Les anciennes entrées auront des champs vides pour les nouveaux champs, et c'est normal. Remplissez-les progressivement.

**Q: Comment migrer 100+ entrées efficacement ?**
R: Utilisez un script de migration (voir Stratégie 2 ci-dessus) ou l'API pour automatiser les changements.
