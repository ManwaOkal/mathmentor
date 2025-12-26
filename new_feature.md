Absolutely — here’s the **very detailed form design** (with the radio buttons, upload UI, statuses, validations, plus the full parsing + storage + retrieval pipeline). This is written so Cursor can implement it without guessing.

---

# Create Activity Form (Teacher UI)

## With Document Upload, Parsing, AI Storage, Retrieval, and Fallback Mode

### Page Context

**Home → Data, Distributions & Decisions → Activities → Create Activity**

Audience: **Teachers** (e.g., “Hillary Mokaya”) creating structured learning activities for students.

---

## 1) Form Layout Overview

**Page Title:** `Create Activity`
**Subheader:** `Manage and organize your learning activities`

**Top Controls (existing):**

* `Sync Activities` (button)
* `+ Create Activity` (button)

When teacher clicks **Create Activity**, open:

* Either a modal or full-page form (either is fine).
  This spec assumes **modal** for continuity.

---

## 2) Form Fields (UI + Meaning)

### A. Activity Title (Required)

**Label:** `Activity Title`
**Placeholder:** `e.g., Algebra Basics`
**Input type:** Single-line text

**Validation**

* Required
* Min length: 3 characters
* Max length: 80 characters

**Stored as**

* `activity.title`

---

### B. Topic (Optional but Recommended)

**Label:** `Topic`
**Placeholder:** `e.g., Solving Linear Equations`
**Input type:** Single-line text (or dropdown if you have taxonomy)

**Validation**

* Max length: 100 characters

**Stored as**

* `activity.topic`

---

### C. Description (Required)

**Label:** `Description`
**Helper text:** `What should the AI teach?`
**Input type:** Multi-line textarea

**Validation**

* Required
* Min length: 20 characters
* Max length: 1000 characters

**Stored as**

* `activity.description`

**Important UX note**

* This is *intent*, not a knowledge source.
* Display a small info tooltip:

  > “The AI follows your uploaded documents when provided. The description guides focus and style, but does not add new source material.”

---

### D. Difficulty (Required)

**Label:** `Difficulty`
**Input type:** Dropdown

Options:

* Beginner
* Intermediate
* Advanced

Default: `Intermediate` (matches your current UI)

**Stored as**

* `activity.difficulty`

---

### E. Teaching Style (Required)

**Label:** `Teaching Style`
**Input type:** Dropdown

Options:

* Guided
* Step-by-step
* Conceptual
* Exam-focused

Default: `Guided` (matches your current UI)

**Stored as**

* `activity.teaching_style`

---

## 3) NEW: Knowledge Source Section (Very Visible)

### F. Knowledge Source (System + Teacher-Controlled)

**Section title:** `Teaching Source`

**Description text (shown under title):**

> “This controls where the AI is allowed to get its information.”

#### Radio Buttons (must exist)

1. **(Recommended) Teacher-Uploaded Documents**

   * Label: `Use teacher-uploaded documents (recommended)`
   * Subtext: `AI teaches strictly from uploaded files for this activity.`
2. **General Math Knowledge**

   * Label: `Use general math knowledge`
   * Subtext: `AI acts like a standard math tutor if no files are uploaded.`

#### Default selection rules (important)

* If there are **0 uploaded documents**: default to **General Math Knowledge**
* If there is **≥1 uploaded document**: default to **Teacher-Uploaded Documents**

#### Locking / warnings (to avoid confusion)

* If teacher selects **Teacher-Uploaded Documents** but uploads none:

  * Show warning banner:

    > “No documents uploaded yet. Upload at least one file or switch to General Math Knowledge.”
  * Disable Create button OR allow Create but force fallback (see “Create Button Rules” below).
* If teacher selects **General Math Knowledge** but *has uploaded docs*:

  * Allow it (teacher may want general tutoring)
  * Show info:

    > “Documents are uploaded but will not be used while this option is selected.”

**Stored as**

* `activity.knowledge_source_mode` = `"TEACHER_DOCS"` or `"GENERAL"`

> NOTE: This is the teacher’s preference. The runtime still enforces the true fallback: if docs don’t exist, you can’t be in doc-only mode.

---

## 4) NEW: Document Upload Section (Math Docs)

### G. Upload Materials

**Section title:** `Upload Materials (PDF or Word)`
**Helper text:**

> “Upload your curriculum notes, textbook excerpts, or worksheets. When ‘Teacher-Uploaded Documents’ is selected, the AI will only teach from these files.”

#### Upload control

Button: `Upload Files`
Supports drag-and-drop area:

* Drop zone text: `Drag & drop files here, or click Upload Files`

Accepted types:

* `.pdf`, `.doc`, `.docx`

File size:

* Max per file: (pick a number; example 25–50MB)
* Max files per activity: (example 20)

#### Uploaded Files List (Required UI)

A table/list showing each file with columns:

* **File Name**
* **Type** (PDF/DOCX)
* **Uploaded** (date/time)
* **Status** (Processing / Parsed / Error)
* **Actions** (View, Replace, Remove)

Statuses (must be visible):

* `Queued`
* `Parsing`
* `Chunking`
* `Embedding`
* `Ready` (final)
* `Error` (with tooltip error message)

**Error display**

* Inline error row:

  > “Parsing failed. Try re-uploading or use a different file format.”

**Replace behavior**

* Replace = upload new version and mark the previous version as inactive (see storage/versioning section)

**Stored as**

* `activity.documents[]`

---

## 5) NEW: “How the AI Will Teach” Summary Panel (UX Guardrail)

Place this near the bottom of the modal, above buttons.

**Panel Title:** `AI Teaching Rules for This Activity`

Render dynamically based on radio selection + whether docs exist:

### If TEACHER_DOCS selected AND docs exist:

* ✅ “AI will use only your uploaded documents.”
* ✅ “AI will use your notation and methods when possible.”
* ⚠️ “If a student asks something not in your materials, the AI will say it’s not covered.”

### If TEACHER_DOCS selected AND docs missing:

* ⚠️ “No documents uploaded yet.”
* ✅ “Upload files to enable document-based teaching.”
* ✅ “Or switch to General Math Knowledge.”

### If GENERAL selected:

* ✅ “AI will use general math knowledge.”
* ✅ “Uploaded documents will not be referenced.”

This panel prevents misunderstandings and reduces support tickets.

---

## 6) Buttons (UI)

Bottom right:

* `Cancel`
* `Create`

### Create Button Rules

Choose one policy and implement consistently:

**Policy A (Strict, recommended):**

* Disable `Create` if:

  * Title missing OR Description missing OR Difficulty missing OR Teaching Style missing
  * OR teacher selected `Teacher-Uploaded Documents` but uploaded documents = 0
* This enforces honest behavior.

**Policy B (Permissive):**

* Allow Create even with TEACHER_DOCS selected and 0 docs
* BUT automatically set runtime mode to fallback GENERAL until docs arrive
* Show warning at create time:

  > “Activity created. It will use general math knowledge until documents are uploaded.”

I strongly recommend **Policy A** for clarity.

---

# Backend + AI Pipeline (Required to Match the UI)

Everything below is the “engine” that makes the UI promises true.

---

## 7) Document Parsing Pipeline (Triggered on Upload)

For each uploaded file:

### Step 1 — Parse (OpenAI Document Parsing)

Extract:

* Full text
* Sections/headings (if detectable)
* Equations and math notation
* Tables if present

Output:

* `parsed_document` containing structured representation

### Step 2 — Chunk (Math-aware)

Chunk by structure:

* Heading boundaries
* Example blocks
* Definition/theorem/proof patterns (if detected)
* Keep equations with surrounding explanation

Each chunk includes:

* `chunk_text`
* `chunk_type` (definition/example/theorem/proof/exercise/general)
* `section_path` (e.g., “Chapter 2 > Vectors > Dot Product”)

### Step 3 — Embed

Compute embeddings per chunk for semantic retrieval.

### Step 4 — Store in AI Storage

Store:

* Raw file metadata
* Parsed text
* Chunks + embeddings + metadata

Update UI status accordingly:
Queued → Parsing → Chunking → Embedding → Ready

---

## 8) AI Storage Schema (Concrete)

### Activity

* `activity_id`
* `teacher_id`
* `title`
* `topic`
* `description`
* `difficulty`
* `teaching_style`
* `knowledge_source_mode` ("TEACHER_DOCS" | "GENERAL")
* `created_at`

### Document

* `document_id`
* `activity_id`
* `teacher_id`
* `filename`
* `filetype`
* `version`
* `status` ("PARSING" | "READY" | "ERROR")
* `created_at`

### Chunk (Core Retrieval Unit)

* `chunk_id`
* `document_id`
* `activity_id`
* `teacher_id`
* `section_title`
* `section_path`
* `chunk_type`
* `raw_text`
* `math_text` (if extracted separately)
* `embedding_vector`
* `version`
* `created_at`

---

## 9) Retrieval & Answering Logic (Runtime)

When a student asks a question inside an activity:

### Step 1 — Determine Mode (Truth, not just preference)

```pseudo
docs_ready = count_ready_documents(activity_id) > 0

if activity.knowledge_source_mode == "TEACHER_DOCS" and docs_ready:
    mode = "TEACHER_ONLY"
else:
    mode = "GENERAL_MATH"
```

This ensures:

* Teacher wants docs + docs exist → strict mode
* Teacher wants docs but none exist → fallback mode
* Teacher chose general → general mode even if docs exist

### Step 2 — If Teacher-Only Mode: Retrieve

* Vector search across `chunks` where:

  * `activity_id = current`
  * `teacher_id = current teacher`
  * `document.status = READY`

Retrieve top K (example K=6–10).
Optionally rerank by similarity.

### Step 3 — Generate Answer

* Provide the retrieved chunks as the only grounding context.
* System instruction must enforce:

  * “Answer only using provided excerpts”
  * “If not present, say not covered”

### Step 4 — If Retrieval Empty

Return:

> “I can’t find this topic in the uploaded materials for this activity.”

No improvising.

### Step 5 — General Mode

Answer normally as a math tutor.

---

## 10) The “No Blending” Rule (Guardrail)

Even if the model “knows” the answer:

* In Teacher-Only mode it must **not** use outside knowledge.
* The only allowed content is what retrieval returns.

If the teacher wants mixing, that’s a **new feature**, not an accidental bug.

---

# Final Deliverable Summary (What Cursor Should Build)

### The Create Activity form must include:

✅ Title
✅ Topic
✅ Description
✅ Difficulty dropdown
✅ Teaching style dropdown
✅ **Teaching source radio buttons**
✅ **Document upload control (PDF/DOC/DOCX)**
✅ **Document list with parsing statuses**
✅ **AI Teaching Rules summary panel**
✅ Clear validation and create rules

### The system must implement:

✅ OpenAI document parsing
✅ Math-aware chunking
✅ Embeddings + AI storage
✅ Retrieval filtered by activity/teacher
✅ Teacher-only mode + general fallback mode logic
✅ “Not covered in materials” behavior when missing

---

If you paste your current UI markup / component structure (even just the JSX/HTML skeleton), I can rewrite it into a **ready-to-implement component spec** with exact field IDs, event handlers, and state transitions—still without guessing.
