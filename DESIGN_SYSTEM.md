# Puller Finance - Design System (from Stitch)

Based on the Stitch-generated designs for "FinPulse" dark theme fintech app.

---

## Color Palette

### Background Colors
- **Primary Background:** `#0F1117` - Very dark blue/black
- **Card Background:** `#1A1D27` - Dark gray-blue
- **Input/Field Background:** `#1A1D27`
- **Border Color:** `#2D3142`

### Brand Colors
- **Primary (Purple):** `#6C5CE7` - Main brand color for buttons, active states
- **Primary Gradient:** `linear-gradient(135deg, #1E1B4B 0%, #2D2670 100%)`

### Semantic Colors
- **Income (Green):** `#00B894` - Positive transactions, income
- **Expense (Red):** `#E17055` - Negative transactions, expenses
- **Success:** `#00B894`
- **Error:** `#E17055`
- **Warning:** `#FDCB6E`
- **Info:** `#6C5CE7`

### Text Colors
- **Primary Text:** `#FFFFFF` - White for headings and important text
- **Secondary Text:** `#9CA3AF` - Gray for labels, subtitles
- **Muted Text:** `#6B7280` - Lighter gray for timestamps, helper text

### Category/Icon Colors
- **Orange:** `#FF6B35` - Food & Dining
- **Blue:** `#4A90E2` - Transportation, Uber
- **Green:** `#27AE60` - Spotify, Subscriptions
- **Pink:** `#E84393` - Shopping, Target
- **Teal:** `#1DD1A1` - Salary, Income

---

## Typography

### Font Family
- **Primary:** `Inter` (Google Font)
- **Fallback:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

### Font Sizes
- **Heading 1:** `32px` / `2rem` - Page titles
- **Heading 2:** `24px` / `1.5rem` - Section titles
- **Heading 3:** `20px` / `1.25rem` - Card titles
- **Body Large:** `16px` / `1rem` - Primary content
- **Body:** `14px` / `0.875rem` - Default text
- **Small:** `12px` / `0.75rem` - Labels, timestamps
- **Tiny:** `10px` / `0.625rem` - Tags, badges

### Font Weights
- **Regular:** `400` - Body text
- **Medium:** `500` - Labels, navigation
- **Semibold:** `600` - Subheadings
- **Bold:** `700` - Headings, important numbers

---

## Spacing System

### Padding/Margin Scale
- **xs:** `4px` - Tight spacing
- **sm:** `8px` - Small spacing
- **md:** `12px` - Default spacing
- **lg:** `16px` - Medium spacing
- **xl:** `24px` - Large spacing
- **2xl:** `32px` - Extra large spacing
- **3xl:** `48px` - Section spacing

---

## Border Radius

### Roundness
- **Small:** `8px` - Small elements
- **Default:** `12px` - Cards, buttons, inputs
- **Large:** `16px` - Large cards
- **Full:** `9999px` - Pills, avatars

---

## Shadows

### Card Shadows
- **Small:** `0 1px 3px rgba(0, 0, 0, 0.3)`
- **Default:** `0 4px 6px rgba(0, 0, 0, 0.4)`
- **Large:** `0 10px 15px rgba(0, 0, 0, 0.5)`
- **XL:** `0 20px 25px rgba(0, 0, 0, 0.6)`

---

## Components

### Buttons

**Primary Button**
- Background: `#6C5CE7`
- Text: `#FFFFFF`
- Padding: `12px 24px`
- Border Radius: `12px`
- Font Weight: `600`
- Hover: Lighten by 10%

**Secondary Button**
- Background: `#1A1D27`
- Border: `1px solid #2D3142`
- Text: `#FFFFFF`
- Padding: `12px 24px`
- Border Radius: `12px`

**Icon Button**
- Size: `40px x 40px`
- Border Radius: `50%`
- Background: `#1A1D27` or transparent

### Inputs

**Text Input**
- Background: `#1A1D27`
- Border: `1px solid #2D3142`
- Border Radius: `12px`
- Padding: `12px 16px`
- Text: `#FFFFFF`
- Placeholder: `#6B7280`
- Focus: Border color `#6C5CE7`, glow effect

### Cards

**Account Card**
- Background: `#1A1D27`
- Border Radius: `12px`
- Padding: `16px`
- Shadow: Default
- Border: `1px solid #2D3142`

**Balance Card (Gradient)**
- Background: `linear-gradient(135deg, #1E1B4B 0%, #2D2670 100%)`
- Border Radius: `16px`
- Padding: `24px`
- No border

**Transaction Card**
- Background: `#1A1D27`
- Border Radius: `12px`
- Padding: `12px 16px`
- Hover: Lighten background by 5%

### Category Icons

**Icon Circle**
- Size: `40px x 40px`
- Border Radius: `50%`
- Background: Category color with 20% opacity
- Icon: Category color at 100%

### Filter Chips

**Active Chip**
- Background: `#6C5CE7`
- Text: `#FFFFFF`
- Border Radius: `9999px`
- Padding: `8px 16px`

**Inactive Chip**
- Background: Transparent
- Text: `#9CA3AF`
- Border: `1px solid #2D3142`
- Border Radius: `9999px`
- Padding: `8px 16px`

### Sidebar Navigation

**Container**
- Width: `240px`
- Background: `#0F1117`
- Border Right: `1px solid #1A1D27`
- Padding: `24px 16px`

**Nav Item (Active)**
- Background: `#6C5CE7`
- Text: `#FFFFFF`
- Border Radius: `12px`
- Padding: `12px 16px`
- Icon + Text

**Nav Item (Inactive)**
- Background: Transparent
- Text: `#9CA3AF`
- Padding: `12px 16px`
- Hover: Background `#1A1D27`

---

## Layout

### Grid System
- **Container Max Width:** `1440px`
- **Gutter:** `24px`
- **Columns:** 12-column grid

### Breakpoints
- **Mobile:** `< 640px`
- **Tablet:** `640px - 1024px`
- **Desktop:** `> 1024px`
- **Wide:** `> 1440px`

---

## Animations

### Transitions
- **Default:** `all 0.2s ease-in-out`
- **Slow:** `all 0.3s ease-in-out`
- **Fast:** `all 0.15s ease-in-out`

### Hover States
- **Cards:** Translate up 2px + increase shadow
- **Buttons:** Lighten background by 10%
- **Links:** Change color + underline

---

## Screen-Specific Notes

### Add First Account Setup
- Centered modal/card design
- Account type selection with icon buttons (Card, Bank, Cash, Savings)
- Color picker with 4 predefined colors
- Full-width primary button
- "Skip for now" link below

### Home Dashboard
- Left sidebar navigation
- Large gradient balance card at top
- Income/Expense pills with icons
- Horizontal scrollable account cards
- Recent transactions list (4 items)
- Quick Send section with avatar circles
- Bottom upgrade CTA card

### Transaction History
- Filter chips at top (All Transactions, Expenses, Income, Transfers, Subscriptions)
- Grouped by date with totals
- Transaction cards with:
  - Category icon (colored circle)
  - Transaction name
  - Category/Account tag
  - Amount (colored red/green)
  - Timestamp
- Floating Action Button (+) at bottom right
- Total per day displayed

---

## Implementation Notes

### TailwindCSS Configuration

Add these custom colors to `tailwind.config.js`:

```javascript
colors: {
  dark: {
    bg: '#0F1117',
    card: '#1A1D27',
    border: '#2D3142',
  },
  brand: {
    purple: '#6C5CE7',
  },
  semantic: {
    income: '#00B894',
    expense: '#E17055',
  }
}
```

### Component Library Priority
1. Button (Primary, Secondary, Icon)
2. Input (Text, Dropdown, Date)
3. Card (Balance, Account, Transaction)
4. NavigationSidebar
5. FilterChips
6. CategoryIcon
7. TransactionListItem
8. AccountCard

---

## Accessibility

- Minimum contrast ratio: 4.5:1 for text
- Focus indicators on all interactive elements
- Keyboard navigation support
- ARIA labels for icon-only buttons
- Semantic HTML structure

---

This design system extracted from Stitch designs. All colors, spacing, and components match the "FinPulse" dark theme.
