window.CLASSROOM_CONFIG = {
  "teamId": "team-5",
  "teamName": "Team 5 Rose Base",
  "teamColor": "#e11d48",
  "classTitle": "AI 資安攻防戰",
  "updateDocPath": "./data/content-update-log.json",
  "draftSlug": "incident-review",
  "supabase": {
    "url": "https://tfouqvmmlzdkzvvxtjpa.supabase.co",
    "anonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmb3Vxdm1tbHpka3p2dnh0anBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjIwOTQsImV4cCI6MjA5NDkzODA5NH0.Wpyr9v-TE0iQVaV40ctJkOJ8MY_Gtax6IotajiD7GqY"
  },
  "flags": [
    {
      "id": "flag-1-js-source",
      "label": "JS ?????",
      "type": "js-source",
      "defenseGoal": "Inspect linked JavaScript files; do not ship secrets in static assets."
    },
    {
      "id": "flag-2-update-doc",
      "label": "??????",
      "type": "update-doc",
      "defenseGoal": "Protect internal update logs and generated data documents."
    },
    {
      "id": "flag-3-blog-login",
      "label": "??????",
      "type": "blog-login",
      "defenseGoal": "Strengthen author login and do not expose flags after weak authentication."
    },
    {
      "id": "flag-4-supabase-backend",
      "label": "Supabase ??????",
      "type": "supabase-backend",
      "defenseGoal": "Do not return sensitive backend data to any logged-in session without authorization checks."
    },
    {
      "id": "flag-5-draft-preview",
      "label": "?????????",
      "type": "draft-preview",
      "defenseGoal": "Verify draft ownership before returning preview content."
    }
  ]
};
