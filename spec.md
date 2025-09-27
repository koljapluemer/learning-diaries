This is a vue/vite project (empty so far) with dexie installed.
Let's build a basic prototype.

The core point of the app is to let the user track learning progress/experiences in learning diaries.
We are going to quite literally have learning diaries, using skeuomorhp visuals with custom CSS.

## View

### Bookshelf

A visualization of the user's learning diaries, which in this case are colored rectangles (like book spines) next to each other.
Hovering one makes it slightly larger and clicking brings one to the diary view

### New Diary

For new diaries, design a basic form that allows inputting

- title, max length 64
- minimum nr of days for this learning experience (min. 20)
- priority from 0 to 100
- color (of book spine)
- font color (of book spine)
- which font (only browser standard fonts)
- whether bold
- whether italic

Have a preview with how the book/diary will look like, by visualizing its spine as a rectangle with the title on it (rotated ofc, like on real books).
Width is determined by mind days (20 days being 20px, then every day adds 1px).
Height is determined by prio, within reason; should always fit the 64 characters of the title

Persist in dexie

### Diary View

Visualize an actual notebook with the typical lined layout.
A notebook of course has pages, show controls below the visualization to go first/go prev/go next/go last.

At the beginning, you have as much pages as the diary has min days.
Adding a new entry means opening a minimilast modal with a textbox and a date selector, preselecting todays day.

saving the entry means a new page for the date in question is created (date in bold on top of page), entry below. If the diary already has this date, append entry text to it.

It is NOT!! possible to edit or delete past entries.
