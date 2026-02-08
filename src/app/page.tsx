'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';
import { 
  BookOpenIcon, 
  ChartBarIcon, 
  GlobeAltIcon, 
  ArrowRightIcon,
  UsersIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  AcademicCapIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // Only redirect to dashboard if onboarding is explicitly complete (true)
      // If onboardingCompleted is false or undefined, OnboardingGuard will handle it
      if (user.onboardingCompleted === true) {
        router.push('/dashboard');
      } else if (user.onboardingCompleted === false) {
        // Redirect to onboarding if not completed
        router.push('/onboarding');
      }
      // If onboardingCompleted is undefined, let OnboardingGuard handle it
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Wolly Creator Hub...</p>
        </div>
      </div>
    );
  }

  // Show loading state while redirecting authenticated users
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50"></div>
        
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 lg:py-40">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-8 flex justify-center">
              <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 ring-1 ring-gray-900/10 hover:ring-gray-900/20">
                <span className="font-semibold text-indigo-600">New:</span> AI-powered book formatting{' '}
                <a href="#" className="whitespace-nowrap font-semibold">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Learn more <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Turn your story into a{' '}
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                bestseller
              </span>
            </h1>
            
            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
              The world&apos;s most powerful platform for independent authors. Publish, distribute, and monetize your books with professional tools that rival traditional publishers.
            </p>
            
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <button
                onClick={() => {
                  const loginSection = document.getElementById('login-section');
                  if (loginSection) {
                    loginSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-purple-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></span>
                <span className="relative flex items-center">
                  Start Publishing Free
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </span>
              </button>
              
              <Link
                href="#features"
                className="text-sm font-semibold leading-6 text-gray-900 hover:text-indigo-600 transition-colors duration-200"
              >
                See how it works <span aria-hidden="true">→</span>
              </Link>
            </div>
            
            {/* Trust Indicators */}
            <div className="mt-16 flex items-center justify-center gap-x-8 text-sm text-gray-500">
              <div className="flex items-center gap-x-2">
                <UsersIcon className="h-5 w-5" />
                <span>10,000+ Authors</span>
              </div>
              <div className="flex items-center gap-x-2">
                <BookOpenIcon className="h-5 w-5" />
                <span>50,000+ Books Published</span>
              </div>
              <div className="flex items-center gap-x-2">
                <CurrencyDollarIcon className="h-5 w-5" />
                <span>$2M+ Paid to Authors</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-24 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-base font-semibold leading-7 text-indigo-600">Everything you need</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              From manuscript to bestseller
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Professional publishing tools that give you the edge over traditional publishing.
            </p>
          </div>
          
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-600">
                    <SparklesIcon className="h-6 w-6 text-white" />
                  </div>
                  AI-Powered Formatting
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Our AI automatically formats your manuscript for print and digital, ensuring professional quality every time.
                  </p>
                </dd>
              </div>
              
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-600">
                    <GlobeAltIcon className="h-6 w-6 text-white" />
                  </div>
                  Global Distribution
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Reach readers worldwide through Amazon, Apple Books, Google Play, and 50+ other retailers automatically.
                  </p>
                </dd>
              </div>
              
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-600">
                    <ChartBarIcon className="h-6 w-6 text-white" />
                  </div>
                  Advanced Analytics
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Track sales, reader engagement, and revenue across all platforms with real-time insights and reports.
                  </p>
                </dd>
              </div>
              
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-600">
                    <AcademicCapIcon className="h-6 w-6 text-white" />
                  </div>
                  Marketing Tools
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Built-in email campaigns, social media integration, and reader engagement tools to grow your audience.
                  </p>
                </dd>
              </div>
              
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-600">
                    <ShieldCheckIcon className="h-6 w-6 text-white" />
                  </div>
                  Rights Protection
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Keep full rights to your work with transparent contracts and industry-leading royalty rates up to 70%.
                  </p>
                </dd>
              </div>
              
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-600">
                    <UsersIcon className="h-6 w-6 text-white" />
                  </div>
                  Author Community
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">
                    Connect with fellow authors, share experiences, and get support from our thriving community of creators.
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:max-w-none">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Trusted by authors worldwide
              </h2>
              <p className="mt-4 text-lg leading-8 text-indigo-200">
                Join thousands of successful authors who chose Wolly for their publishing journey.
              </p>
            </div>
            <dl className="mt-16 grid grid-cols-1 gap-8 sm:mt-20 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col-reverse">
                <dt className="text-base leading-7 text-indigo-200">Authors Published</dt>
                <dd className="text-2xl font-bold leading-9 tracking-tight text-white">10,000+</dd>
              </div>
              <div className="flex flex-col-reverse">
                <dt className="text-base leading-7 text-indigo-200">Books Published</dt>
                <dd className="text-2xl font-bold leading-9 tracking-tight text-white">50,000+</dd>
              </div>
              <div className="flex flex-col-reverse">
                <dt className="text-base leading-7 text-indigo-200">Revenue Generated</dt>
                <dd className="text-2xl font-bold leading-9 tracking-tight text-white">$2M+</dd>
              </div>
              <div className="flex flex-col-reverse">
                <dt className="text-base leading-7 text-indigo-200">Countries Reached</dt>
                <dd className="text-2xl font-bold leading-9 tracking-tight text-white">190+</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-base font-semibold leading-7 text-indigo-600">Simple, transparent pricing</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Start publishing today
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              No upfront costs. We only succeed when you succeed.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-1 lg:max-w-2xl lg:mx-auto">
              <div className="rounded-3xl bg-white p-8 ring-1 ring-gray-200 xl:p-10">
                <div className="flex items-center justify-between gap-x-4">
                  <h3 className="text-lg font-semibold leading-8 text-gray-900">Creator Plan</h3>
                  <p className="text-sm font-semibold leading-6 text-indigo-600">Free to start</p>
                </div>
                <p className="mt-4 text-sm leading-6 text-gray-600">
                  Perfect for authors ready to publish their first book or expand their catalog.
                </p>
                <p className="mt-6 flex items-baseline gap-x-1">
                  <span className="text-4xl font-bold tracking-tight text-gray-900">20%</span>
                  <span className="text-sm font-semibold leading-6 text-gray-600">platform fee</span>
                </p>
                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                  <li className="flex gap-x-3">
                    <span className="text-indigo-600">✓</span>
                    Unlimited book uploads
                  </li>
                  <li className="flex gap-x-3">
                    <span className="text-indigo-600">✓</span>
                    Global distribution to 50+ retailers
                  </li>
                  <li className="flex gap-x-3">
                    <span className="text-indigo-600">✓</span>
                    Advanced analytics dashboard
                  </li>
                  <li className="flex gap-x-3">
                    <span className="text-indigo-600">✓</span>
                    Marketing tools and resources
                  </li>
                  <li className="flex gap-x-3">
                    <span className="text-indigo-600">✓</span>
                    AI-powered formatting
                  </li>
                  <li className="flex gap-x-3">
                    <span className="text-indigo-600">✓</span>
                    Community support
                  </li>
                </ul>
                <a
                  href="#login-section"
                  className="mt-8 block w-full rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  Get started
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div id="about" className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:max-w-none">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                About Wolly
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600 max-w-3xl mx-auto">
                Wolly was founded with a simple mission: to democratize publishing and empower independent authors worldwide. 
                We believe every story deserves to be told, and every author deserves professional tools to succeed.
              </p>
              <p className="mt-4 text-lg leading-8 text-gray-600 max-w-3xl mx-auto">
                Our platform combines cutting-edge AI technology with intuitive design, making it easier than ever to 
                publish, distribute, and monetize your books. Join thousands of authors who have chosen Wolly to bring 
                their stories to life.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-lg font-semibold leading-8 tracking-tight text-indigo-600">Testimonials</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              What authors are saying
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-7xl sm:mt-20">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <figure className="rounded-2xl bg-gray-50 p-8 text-sm leading-6 h-full">
                  <blockquote className="text-gray-900">
                    <p>&ldquo;Wolly transformed my self-publishing experience. I went from struggling with formatting to having a professional book in stores worldwide in just weeks.&rdquo;</p>
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-x-4">
                    <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center">
                      <span className="text-white font-semibold">SJ</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Sarah Johnson</div>
                      <div className="text-gray-600">Romance Author, 5 Books Published</div>
                    </div>
                  </figcaption>
                </figure>
              </div>
              <div>
                <figure className="rounded-2xl bg-gray-50 p-8 text-sm leading-6 h-full">
                  <blockquote className="text-gray-900">
                    <p>&ldquo;The analytics dashboard is incredible. I can see exactly where my sales are coming from and optimize my marketing strategy in real-time.&rdquo;</p>
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-x-4">
                    <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center">
                      <span className="text-white font-semibold">MC</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Michael Chen</div>
                      <div className="text-gray-600">Business Author, $50K+ Revenue</div>
                    </div>
                  </figcaption>
                </figure>
              </div>
              <div>
                <figure className="rounded-2xl bg-gray-50 p-8 text-sm leading-6 h-full">
                  <blockquote className="text-gray-900">
                    <p>&ldquo;The community support and marketing tools helped me build a loyal reader base. My latest book hit #1 in its category!&rdquo;</p>
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-x-4">
                    <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center">
                      <span className="text-white font-semibold">ER</span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Elena Rodriguez</div>
                      <div className="text-gray-600">Thriller Author, Bestseller</div>
                    </div>
                  </figcaption>
                </figure>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Section */}
      <div id="login-section" className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Ready to start your publishing journey?
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Join thousands of authors who trust Wolly to bring their stories to life.
            </p>
          </div>
          
          <div className="mx-auto max-w-md">
            <div className="bg-white rounded-xl shadow-lg p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900">Wolly Creator Hub</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Sign in or create your account to start publishing
                </p>
              </div>
              
              <LoginForm />
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Your story deserves to be told
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-indigo-200">
              Don&apos;t let your manuscript gather dust. Join the authors who are already building their legacy with Wolly.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <button
                onClick={() => {
                  const loginSection = document.getElementById('login-section');
                  if (loginSection) {
                    loginSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all duration-200"
              >
                Start Publishing Free
              </button>
              <Link
                href="#features"
                className="text-sm font-semibold leading-6 text-white hover:text-indigo-200 transition-colors duration-200"
              >
                Learn more <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}