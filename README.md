# Wolly Creator Hub

A comprehensive Next.js web application for authors and publishers to create, manage, and publish books on the Wolly platform.

## Features

- **User Authentication**: Secure login with Firebase Authentication
- **Book Creation Wizard**: Multi-step form for creating books with:
  - Book details (title, author, description, categories, keywords)
  - File uploads (manuscript and cover)
  - Pricing and distribution settings
  - AI content disclosure
  - Review and publish functionality
- **Dashboard**: Manage all your books in one place
- **File Management**: Upload and store manuscripts and covers in Firebase Storage
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Firebase (Firestore, Storage, Authentication)
- **State Management**: Zustand
- **UI Components**: Headless UI, Heroicons
- **Form Handling**: React Hook Form with Zod validation
- **File Uploads**: React Dropzone
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project with Firestore, Storage, and Authentication enabled

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd wolly-creator-hub
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Update the Firebase configuration in `.env.local` with your project credentials.

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Dashboard page
│   ├── create-book/       # Book creation page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── auth/             # Authentication components
│   └── book-creation/    # Book creation components
│       └── steps/        # Individual form steps
├── contexts/             # React contexts
├── lib/                  # Utility libraries
├── services/             # Firebase services
├── stores/               # Zustand stores
└── types/                # TypeScript type definitions
```

## Firebase Setup

1. Create a new Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)

2. Enable the following services:
   - **Authentication**: Enable Email/Password sign-in
   - **Firestore Database**: Create database in production mode
   - **Storage**: Create storage bucket

3. Update the Firebase configuration in `src/lib/firebase.ts` and `.env.local`

## Usage

### Creating a Book

1. Sign in to the application
2. Click "Create New Book" on the dashboard
3. Follow the 4-step wizard:
   - **Book Details**: Enter title, author, description, categories, etc.
   - **Upload Content**: Upload manuscript and cover files
   - **Pricing & Distribution**: Set pricing, royalties, and distribution options
   - **Review & Publish**: Review all information and publish

### Managing Books

- View all your books on the dashboard
- Edit book details (coming soon)
- Publish/unpublish books
- Track publication status

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Style

- TypeScript for type safety
- Tailwind CSS for styling
- ESLint for code quality
- Prettier for code formatting (recommended)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email support@wolly.com or create an issue in the repository.
