# Liga-Tabellen System - Quick Reference

## 🚀 Quick Start

### Get League Table for Team
```typescript
// Get table for 1st team (Kreisliga)
const response = await fetch(`${API_BASE_URL}/api/tabellen-eintraege?filters[liga][name][$eq]=Kreisliga Tauberbischofsheim&populate=liga&sort=platz:asc`);

// Get table for 2nd team (Kreisklasse A)  
const response = await fetch(`${API_BASE_URL}/api/tabellen-eintraege?filters[liga][name][$eq]=Kreisklasse A Tauberbischofsheim&populate=liga&sort=platz:asc`);

// Get table for 3rd team (Kreisklasse B)
const response = await fetch(`${API_BASE_URL}/api/tabellen-eintraege?filters[liga][name][$eq]=Kreisklasse B Tauberbischofsheim&populate=liga&sort=platz:asc`);
```

### Team-Liga Mapping
```typescript
const TEAM_LIGA_MAPPING = {
  '1': 'Kreisliga Tauberbischofsheim',
  '2': 'Kreisklasse A Tauberbischofsheim', 
  '3': 'Kreisklasse B Tauberbischofsheim'
};
```

### Viktoria Team Names
```typescript
const VIKTORIA_TEAMS = {
  '1': 'SV Viktoria Wertheim',
  '2': 'SV Viktoria Wertheim II',
  '3': 'SpG Vikt. Wertheim 3/Grünenwort'
};
```

## 📊 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/tabellen-eintraege` | Get all table entries |
| GET | `/api/tabellen-eintraege/:id` | Get specific entry |
| POST | `/api/tabellen-eintraege` | Create new entry |
| PUT | `/api/tabellen-eintraege/:id` | Update entry |
| DELETE | `/api/tabellen-eintraege/:id` | Delete entry |

## 🔍 Common Filters

```bash
# By league
?filters[liga][name][$eq]=Kreisliga%20Tauberbischofsheim

# By team name
?filters[team_name][$contains]=Viktoria

# By position range (top 3)
?filters[platz][$lte]=3

# By points (more than 20)
?filters[punkte][$gt]=20
```

## 📋 Data Structure

```typescript
interface TabellenEintrag {
  id: number;
  attributes: {
    team_name: string;        // Required
    platz: number;           // Required, min: 1
    spiele: number;          // Default: 0
    siege: number;           // Default: 0
    unentschieden: number;   // Default: 0
    niederlagen: number;     // Default: 0
    tore_fuer: number;       // Default: 0
    tore_gegen: number;      // Default: 0
    tordifferenz: number;    // Default: 0
    punkte: number;          // Default: 0
    liga: {                  // Required relation
      data: {
        id: number;
        attributes: {
          name: string;
          kurz_name: string;
        };
      };
    };
    team_logo?: MediaData;   // Optional
  };
}
```

## ⚡ Service Implementation

```typescript
class LeagueService {
  async fetchLeagueStandingsByTeam(teamId: '1' | '2' | '3') {
    const ligaName = TEAM_LIGA_MAPPING[teamId];
    const response = await fetch(
      `${API_BASE_URL}/api/tabellen-eintraege?filters[liga][name][$eq]=${encodeURIComponent(ligaName)}&populate=liga&sort=platz:asc`
    );
    const { data } = await response.json();
    return data.map(this.transformTabellenEintragToTeam);
  }

  transformTabellenEintragToTeam(entry: TabellenEintrag): Team {
    return {
      id: entry.id,
      attributes: {
        name: entry.attributes.team_name,
        tabellenplatz: entry.attributes.platz,
        punkte: entry.attributes.punkte,
        spiele_gesamt: entry.attributes.spiele,
        // ... other mappings
      }
    };
  }
}
```

## 🎯 Frontend Integration

```typescript
const LeagueTable = ({ selectedTeam }: { selectedTeam: '1' | '2' | '3' }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  
  useEffect(() => {
    leagueService.fetchLeagueStandingsByTeam(selectedTeam)
      .then(setTeams)
      .catch(console.error);
  }, [selectedTeam]);

  const isViktoriaTeam = (teamName: string) => {
    return VIKTORIA_TEAMS[selectedTeam] === teamName;
  };

  return (
    <table>
      {teams.map(team => (
        <tr key={team.id} className={isViktoriaTeam(team.attributes.name) ? 'viktoria-highlight' : ''}>
          <td>{team.attributes.tabellenplatz}</td>
          <td>{team.attributes.name}</td>
          <td>{team.attributes.punkte}</td>
        </tr>
      ))}
    </table>
  );
};
```

## 🛠️ Content Management

### Strapi Admin Tasks
1. **Content Manager** → **Tabellen-Eintrag**
2. Filter by Liga: Use dropdown filter
3. Update stats: Edit individual entries
4. Bulk operations: Select multiple entries

### Common Updates
```javascript
// Update after match result
{
  spiele: currentSpiele + 1,
  siege: currentSiege + (won ? 1 : 0),
  unentschieden: currentUnentschieden + (draw ? 1 : 0),
  niederlagen: currentNiederlagen + (lost ? 1 : 0),
  tore_fuer: currentToreFuer + goalsFor,
  tore_gegen: currentToreGegen + goalsAgainst,
  tordifferenz: (currentToreFuer + goalsFor) - (currentToreGegen + goalsAgainst),
  punkte: currentPunkte + (won ? 3 : draw ? 1 : 0)
}
```

## 🚨 Migration Notes

### ❌ Deprecated (Don't Use)
- Team collection table statistics fields
- `/api/teams` for league table data
- Direct team-based table queries

### ✅ New Approach (Use This)
- Tabellen-Eintrag collection for all table data
- `/api/tabellen-eintraege` for league tables
- Liga-based filtering and sorting

### Migration Mapping
| Old Field (Team) | New Field (Tabellen-Eintrag) |
|------------------|------------------------------|
| `tabellenplatz` | `platz` |
| `spiele_gesamt` | `spiele` |
| `tore_fuer` | `tore_fuer` |
| `tore_gegen` | `tore_gegen` |
| `tordifferenz` | `tordifferenz` |
| `punkte` | `punkte` |
| `siege` | `siege` |
| `unentschieden` | `unentschieden` |
| `niederlagen` | `niederlagen` |

## 🔧 Troubleshooting

### Common Issues
| Problem | Solution |
|---------|----------|
| Table not loading | Check liga filter spelling |
| Viktoria not highlighted | Verify exact team name |
| Wrong order | Use `sort=platz:asc` |
| Missing data | Check `populate=liga` |

### Debug Queries
```bash
# Test liga filter
curl "localhost:1337/api/tabellen-eintraege?filters[liga][name][$eq]=Kreisliga%20Tauberbischofsheim"

# Check all entries
curl "localhost:1337/api/tabellen-eintraege?populate=liga"

# Verify team names
curl "localhost:1337/api/tabellen-eintraege?filters[team_name][$contains]=Viktoria&populate=liga"
```

## 📚 Documentation Links

- [Full API Documentation](./TABELLEN_EINTRAG_API_DOCUMENTATION.md)
- [Content Manager Guide](./LIGA_TABELLEN_CONTENT_MANAGER_GUIDE.md)
- [Strapi Admin Guide](./LIGA_TABELLEN_STRAPI_ADMIN_GUIDE.md)
- [Main API Reference](../API_REFERENCE_FOR_FRONTEND.md)

---

**Need Help?** Check the full documentation or contact the development team.