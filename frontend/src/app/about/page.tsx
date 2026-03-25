import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 text-center">
          About Kentaz Emporium
        </h1>
        <div className="max-w-3xl mx-auto">
          <p className="text-lg text-gray-600 mb-6">
            Welcome to Kentaz Emporium, your premier destination for luxury fashion, lifestyle, and wellness in Nigeria.
          </p>
          <p className="text-lg text-gray-600 mb-6">
            Founded in Abuja, we curate the finest selection of fashion, beauty, and lifestyle products from around the world, bringing global luxury to your doorstep.
          </p>
          <p className="text-lg text-gray-600 mb-6">
            Our tagline says it all: <strong>Luxury. Lifestyle. Wellness.</strong> We believe in providing not just products, but an experience that elevates every aspect of your life.
          </p>
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Services</h2>
            <ul className="space-y-2 text-gray-600">
              <li>• Premium Fashion & Accessories</li>
              <li>• Luxury Skincare & Beauty</li>
              <li>• Mental Health Consultation</li>
              <li>• Professional Podcast Studio</li>
            </ul>
          </div>
          <div className="mt-12 text-center">
            <Link 
              href="/contact" 
              className="inline-block bg-gray-900 text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
