# Theracademy showcase

## Routes

- `/`: new public showcase, seven chapters.
- `/sunum`: presenter mode; arrows / Page Up / Page Down / Home / End when focus is outside a control. Touch navigation and fullscreen controls are provided.
- `/dosya`: HTML print companion and PDF download.
- `/randevu`: original appointment implementation retained, unlinked from showcase.
- `/crocodil/**`: original clinic application retained.

The previous public service, shop, courses, triage, contact, privacy and terms pages and their unused visual assets were removed at the owner's request. Clinical runtime and database code are not changed. This is not a database migration. Hiding a link is not access control.

## Content and media

`src/content/theracademy.json` is the chapter source for the HTML dossier and PDF. The showcase uses shortened editorial versions of those chapters. Financial models and roadmap periods are proposals, not validated results. The demo uses original fictional text and vector art, not patient records, live AI, or clinical recommendations.

The visual system uses original SVG/CSS animation. Sound is generated locally using Web Audio and starts only after an explicit click. Visibility changes suspend audio. Reduced motion and a global pause control are supported. There are no externally loaded media assets or audio services. Existing application fonts still use the repository's Next font setup.

## Print companion

Run `python3 scripts/build-theracademy-dossier.py` from the repository root (requires reportlab and DejaVu Sans). Set `THERACADEMY_FONT_DIR` to override the font folder. The script uses the same JSON chapters and outputs `public/theracademy/theracademy-toplanti-dosyasi.pdf`.

This is a first meeting draft. A permanent published destination is required before embedding QR codes in printed copies; no speculative URL is encoded.

## Verification

- `npx tsc --noEmit`: passed.
- `npm run build`: passed; all clinic and appointment routes appear in the output.
- Git diff verified no changes under `src/app/crocodil`, `src/components/crocodil`, `src/lib/crocodil`, `src/lib/supabase`, or the appointment page / schema / policies.
- PDF rendered and inspected as a ten-page contact sheet.
- Browser QA was unavailable in the managed environment. Desktop/mobile layout, sound playback, presenter keyboard navigation and real projector use need browser review before this is considered meeting-ready.

No production deployment, database inspection, real patient operation, or account interaction was performed.
