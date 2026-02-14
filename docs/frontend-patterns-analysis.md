# Frontend patterns analysis and adjustments

Analysis of the codebase against the project’s frontend-patterns skill and changes applied.

## Summary of changes

### 1. Shared hooks (`src/hooks/`)

- **`useToggle(initialValue?)`**  
  Boolean state with a stable setter for modals, accordions, and any open/closed state. Returns `[value, setValue]` so you can call `setOpen(false)` or `setOpen(prev => !prev)`.

- **`usePhoneInputStyles()`**  
  Single place that injects dark-theme styles for `react-phone-number-input` (country dropdown). Removes duplicated `useEffect` + style injection from multiple components.

### 2. Components updated to use these patterns

- **`auth-form.tsx`** – Uses `usePhoneInputStyles()` instead of local style injection.
- **`edit-profile-dialog.tsx`** – Uses `useToggle(false)` for dialog open state and `usePhoneInputStyles()`.
- **`book-course-dialog.tsx`** – Uses `useToggle(true)` for dialog open state.
- **`cancel-booking-dialog.tsx`** – Uses `useToggle(true)` for dialog open state.

---

## What already matched good patterns

- **UI composition** – `Dialog`, `Tabs`, and other Radix-based components use compound parts (`DialogHeader`, `DialogFooter`, `TabsList`, `TabsTrigger`, etc.).
- **List performance** – `CourseCard` is wrapped in `React.memo` to avoid unnecessary re-renders in course lists.
- **Callbacks** – `CoursesPageClient` passes stable handlers with `useCallback` for book/cancel actions.
- **Controlled form + validation** – Auth form uses local state, a `validate()` function, and an errors object, aligned with the skill’s controlled form pattern.
- **Server actions** – Forms use `useFormState` / server actions for auth and booking; no ad-hoc fetch in components.

---

## Recommendations for later

1. **Forms**  
   You already use `react-hook-form` and Zod elsewhere; consider using them in `auth-form` and `edit-profile-dialog` for validation and less boilerplate (e.g. `@hookform/resolvers/zod`).

2. **Dialogs with async confirm**  
   The “open + loading + onConfirm” pattern in `BookCourseDialog` and `CancelBookingDialog` could be abstracted into a small `useConfirmDialog()` hook (open, loading, handleOpenChange, handleConfirm wrapper) if more dialogs follow the same pattern.

3. **Long lists**  
   If course or admin tables grow large, consider `@tanstack/react-virtual` for virtualization (as in the frontend-patterns skill).

4. **Error boundaries**  
   Add an error boundary around major sections (e.g. course list, admin) so one failing component doesn’t take down the whole page.

5. **Focus in modals**  
   For accessibility, ensure focus is trapped inside the dialog and restored on close; Radix Dialog may already handle this—worth confirming.

6. **Phone input styles**  
   `register-form.tsx` and `globals.css` also define styles for the phone dropdown. You could rely on `usePhoneInputStyles()` everywhere and trim duplicate rules in CSS if you want one source of truth.

---

## Hook usage reference

```ts
// Toggle (e.g. dialog open)
const [open, setOpen] = useToggle(false)
// setOpen(false) or setOpen(true) or setOpen(prev => !prev)

// Phone input dark theme (any component using PhoneInput)
usePhoneInputStyles()
```

All hooks are exported from `@/hooks`.
