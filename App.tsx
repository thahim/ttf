import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { AspectRatio } from './types';
import { generateImageFromPrompt, generateImageFromPromptAndImage } from './services/geminiService';

interface Generation {
  id: number;
  prompt: string;
  imageUrl: string;
  referenceImages: { data: string; mimeType: string }[];
  aspectRatio: AspectRatio;
}

const PhotoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

const Spinner: React.FC = () => (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
  </div>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col justify-center items-center h-full text-red-700 text-center p-4 bg-red-100 rounded-lg">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <p className="font-semibold text-red-800">Generation Failed</p>
    <p className="text-sm">{message}</p>
  </div>
);

const fileToBase64 = (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve({ data: base64Data, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
  });
};

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generationHistory, setGenerationHistory] = useState<Generation[]>([]);
  const [referenceImages, setReferenceImages] = useState<{ data: string; mimeType: string }[]>([]);
  const historyEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [generationHistory, isLoading]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (referenceImages.length + files.length > 3) {
        setError('You can upload a maximum of 3 reference images.');
        return;
      }
      try {
        const base64Images = await Promise.all(files.map(fileToBase64));
        setReferenceImages((prev) => [...prev, ...base64Images]);
        setError(null);
      } catch (err) {
        setError('Failed to read image files.');
        console.error(err);
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGenerateImage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError("Please enter a prompt.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const currentPrompt = prompt;
    const currentAspectRatio = aspectRatio;
    const currentReferenceImages = referenceImages;

    try {
      const url = currentReferenceImages.length > 0
        ? await generateImageFromPromptAndImage(currentPrompt, currentReferenceImages)
        : await generateImageFromPrompt(currentPrompt, currentAspectRatio);
      
      setGenerationHistory(prev => [
        ...prev,
        {
          id: Date.now(),
          prompt: currentPrompt,
          imageUrl: url,
          referenceImages: currentReferenceImages,
          aspectRatio: currentAspectRatio
        }
      ]);
      setPrompt('');
      setReferenceImages([]);

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [prompt, aspectRatio, referenceImages]);

  const handleDownload = useCallback((imageUrl: string) => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `ai-generated-${Date.now()}.jpeg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">
      <div className="flex flex-col items-center p-4 sm:p-6">
        <div className="w-full max-w-6xl mx-auto">
          <header className="text-center mb-8 flex flex-col items-center justify-center gap-2">
            <div className="flex items-center justify-center gap-4">
              <img 
                src="https://raw.githubusercontent.com/thahim/ttd/main/1000708509-removebg-preview.png" 
                alt="Tiny Tunes & Facts Logo" 
                className="h-12 w-12 rounded-full object-cover" 
              />
              <span className="text-xl font-bold tracking-wide">
                Powered by Tiny Tunes & Facts
              </span>
            </div>
            <a 
              href="https://youtube.com/@tinytunesfacts?feature=shared" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Visit our YouTube channel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600 hover:text-red-700 transition-colors" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.255 0 9.438v5.123c.029 4.183.488 5.988 4.385 6.254 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.07 4.385-6.254V9.438c-.029-4.183-.488-5.988-4.385-6.254zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
          </header>

          <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="bg-gray-50 p-6 rounded-2xl shadow-lg border border-gray-200 sticky top-6">
              <form onSubmit={handleGenerateImage}>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-gray-600 mb-2">
                      Enter your prompt
                    </label>
                    <textarea
                      id="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., A majestic lion wearing a crown, cinematic lighting"
                      className="w-full h-32 p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-200 resize-none"
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label htmlFor="image-upload" className="block text-sm font-medium text-gray-600 mb-2">
                      Reference Images (optional)
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label htmlFor="image-upload" className="relative cursor-pointer bg-gray-50 rounded-md font-medium text-purple-600 hover:text-purple-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-white focus-within:ring-purple-500 px-1">
                            <span>Upload files</span>
                            <input id="image-upload" name="image-upload" type="file" className="sr-only" multiple accept="image/*" onChange={handleImageUpload} disabled={isLoading || referenceImages.length >= 3} />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG up to 10MB. Max 3 images.</p>
                      </div>
                    </div>
                  </div>

                  {referenceImages.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">Uploaded images:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {referenceImages.map((image, index) => (
                          <div key={index} className="relative group">
                            <img src={`data:${image.mimeType};base64,${image.data}`} alt={`Reference ${index + 1}`} className="rounded-lg object-cover h-24 w-full" />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute top-1 right-1 bg-red-600/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                              aria-label="Remove image"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      Aspect Ratio
                    </label>
                    <div className={`flex space-x-3 ${referenceImages.length > 0 ? 'opacity-50' : ''}`}>
                      {(['16:9', '9:16'] as AspectRatio[]).map((ratio) => (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setAspectRatio(ratio)}
                          className={`flex-1 py-2 px-4 rounded-md text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 focus:ring-purple-500 ${
                            aspectRatio === ratio
                              ? 'bg-purple-600 text-white shadow-md'
                              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                          }`}
                          disabled={isLoading || referenceImages.length > 0}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                    {referenceImages.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">Aspect ratio is determined by the model when using reference images.</p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !prompt.trim()}
                  className="mt-8 w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-transform duration-200"
                >
                  {isLoading ? 'Generating...' : 'Generate Image'}
                </button>
              </form>
            </div>

            <div className="h-[calc(100vh-12rem)] bg-gray-100 rounded-2xl p-4 border border-gray-300 overflow-y-auto flex flex-col gap-6">
              {generationHistory.length === 0 && !isLoading && !error && (
                <div className="m-auto text-center text-gray-500 flex flex-col items-center">
                  <PhotoIcon className="w-20 h-20 mb-2" />
                  <p className="text-lg">Your generated images will appear here</p>
                  <p className="text-sm">Enter a prompt to get started!</p>
                </div>
              )}
              
              {generationHistory.map((gen) => (
                <div key={gen.id} className="bg-white p-4 rounded-lg shadow-md animate-fade-in">
                  <p className="text-gray-700 mb-3 font-medium">"{gen.prompt}"</p>
                  {gen.referenceImages.length > 0 && (
                    <div className="flex gap-2 mb-3">
                      {gen.referenceImages.map((img, idx) => (
                        <img key={idx} src={`data:${img.mimeType};base64,${img.data}`} className="w-16 h-16 rounded-md object-cover" />
                      ))}
                    </div>
                  )}
                  <div className="relative group">
                    <img
                      src={gen.imageUrl}
                      alt={gen.prompt}
                      className={`w-full h-full object-cover rounded-lg ${
                          gen.referenceImages.length === 0 && gen.aspectRatio === '16:9' ? 'aspect-[16/9]' : ''
                      } ${
                          gen.referenceImages.length === 0 && gen.aspectRatio === '9:16' ? 'aspect-[9/16]' : ''
                      }`}
                    />
                    <button
                      onClick={() => handleDownload(gen.imageUrl)}
                      className="absolute bottom-2 right-2 bg-green-600/80 hover:bg-green-700 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                      aria-label="Download image"
                    >
                      <DownloadIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
              
              {isLoading && <Spinner />}
              {error && !isLoading && <ErrorDisplay message={error} />}
              <div ref={historyEndRef} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;