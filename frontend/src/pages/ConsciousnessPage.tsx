import React from 'react';
import Head from 'next/head';
import ConsciousnessUpload from '../components/ConsciousnessUpload';

const ConsciousnessPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Consciousness Upload - StarkEd Education</title>
        <meta name="description" content="Upload and preserve your consciousness on the blockchain for digital immortality" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-indigo-600 mb-4">
              Digital Consciousness Upload
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Preserve your learning experiences and knowledge on the blockchain, 
              enabling digital immortality of educational achievements and continuous 
              learning across lifetimes.
            </p>
          </div>
          
          <ConsciousnessUpload />
        </div>
      </main>
    </>
  );
};

export default ConsciousnessPage;
