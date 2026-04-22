// File: src/pages/DocumentsPage.tsx

import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { getTrip, getUploadSignature, addDocumentToTrip, deleteDocument, verifyDocumentAI, verifyDocumentLeader } from '../services/apiService';
import type { Trip } from '../services/apiService';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

// Helper to get a simple icon based on file type
const FileIcon = ({ type }: { type: string }) => {
    if (type.startsWith('image')) return <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
    if (type.includes('pdf')) return <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
};

export const DocumentsPage = () => {
    const { tripId } = useParams<{ tripId: string }>();
    const [trip, setTrip] = useState<Trip | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [documentName, setDocumentName] = useState('');
    const [verifyingDocId, setVerifyingDocId] = useState<string | null>(null);

    const fetchTrip = async () => {
        if (!tripId) return;
        try {
            setIsLoading(true);
            const data = await getTrip(tripId);
            setTrip(data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTrip();
    }, [tripId]);

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) {
            return;
        }
        const file = e.target.files[0];
        setSelectedFile(file);
        setDocumentName(file.name); // Pre-fill with filename
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !tripId || !documentName.trim()) {
            return;
        }

        setIsModalOpen(false);
        setIsUploading(true);
        setError(null);

        try {
            // 1. Get signature from our backend
            const { signature, timestamp, api_key } = await getUploadSignature();
            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
            const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

            // 2. Upload directly to Cloudinary
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('api_key', api_key);
            formData.append('timestamp', timestamp.toString());
            formData.append('signature', signature);

            const cloudinaryResponse = await axios.post(uploadUrl, formData);
            const { public_id, secure_url, resource_type } = cloudinaryResponse.data;

            // 3. Save metadata to our backend with custom name
            await addDocumentToTrip(tripId, {
                public_id,
                secure_url,
                original_filename: documentName.trim(),
                resource_type
            });

            // 4. Refresh data
            await fetchTrip();

        } catch (err) {
            setError("Upload failed. Please try again.");
            console.error(err);
        } finally {
            setIsUploading(false);
            setSelectedFile(null);
            setDocumentName('');
        }
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedFile(null);
        setDocumentName('');
    };

    const handleDelete = async (publicId: string) => {
        if (!tripId || !window.confirm("Are you sure you want to delete this document?")) return;
        try {
            await deleteDocument(tripId, publicId);
            await fetchTrip(); // Refresh list
        } catch (err) {
            setError("Failed to delete document.");
        }
    };

    const handleAIVerify = async (publicId: string) => {
        if (!tripId) return;
        setVerifyingDocId(publicId);
        try {
            await verifyDocumentAI(tripId, publicId);
            await fetchTrip();
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setVerifyingDocId(null);
        }
    };

    const handleLeaderVerify = async (publicId: string) => {
        if (!tripId) return;
        setVerifyingDocId(publicId);
        try {
            await verifyDocumentLeader(tripId, publicId);
            await fetchTrip();
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setVerifyingDocId(null);
        }
    };

    const renderVerificationBadge = (status?: string) => {
        if (status === 'leader_verified') {
            return <span className="bg-green-600/20 text-green-400 border border-green-500/50 px-2 py-0.5 rounded text-xs font-semibold ml-2">✅ Leader Verified</span>;
        }
        if (status === 'ai_verified') {
            return <span className="bg-blue-600/20 text-blue-400 border border-blue-500/50 px-2 py-0.5 rounded text-xs font-semibold ml-2">🤖 AI Verified</span>;
        }
        return <span className="bg-yellow-600/20 text-yellow-400 border border-yellow-500/50 px-2 py-0.5 rounded text-xs font-semibold ml-2">⏳ Pending</span>;
    };

    if (isLoading) return <div className="text-center p-10">Loading documents...</div>;
    if (error) return <div className="text-center p-10 text-red-500">Error: {error}</div>;

    return (
        <div className="container mx-auto p-6">
            <Link to={`/trips/${tripId}`} className="text-blue-500 hover:underline mb-4 inline-block">&larr; Back to Trip</Link>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Documents for {trip?.destination}</h1>
                <div>
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileSelect}
                        disabled={isUploading}
                    />
                    <label
                        htmlFor="file-upload"
                        className={`px-4 py-2 rounded-md font-semibold text-white cursor-pointer ${isUploading ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {isUploading ? 'Uploading...' : '+ Upload Document'}
                    </label>
                </div>
            </div>

            {trip?.documents && trip.documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {trip.documents.map((doc) => (
                        <div key={doc.public_id} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 flex items-center justify-between border border-gray-700 hover:border-gray-600">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gray-700 rounded-lg">
                                    <FileIcon type={doc.resource_type} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center">
                                      <a href={doc.secure_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-white hover:text-blue-400 break-all transition-colors duration-200">
                                          {doc.original_filename}
                                      </a>
                                      {renderVerificationBadge(doc.verification_status)}
                                    </div>
                                    <p className="text-sm text-gray-400 mt-1">Uploaded: {new Date(doc.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {doc.verification_status !== 'leader_verified' && doc.verification_status !== 'ai_verified' && (
                                    <button
                                        onClick={() => handleAIVerify(doc.public_id)}
                                        disabled={verifyingDocId === doc.public_id}
                                        className="text-xs bg-blue-600/80 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
                                    >
                                        {verifyingDocId === doc.public_id ? '...' : 'AI Verify'}
                                    </button>
                                )}
                                {doc.verification_status === 'ai_verified' && (
                                    <button
                                        onClick={() => handleLeaderVerify(doc.public_id)}
                                        disabled={verifyingDocId === doc.public_id}
                                        className="text-xs bg-green-600/80 hover:bg-green-600 text-white px-2 py-1 rounded transition-colors disabled:opacity-50"
                                        title="Only Trip Leader can verify manually"
                                    >
                                        {verifyingDocId === doc.public_id ? '...' : 'Leader Verify'}
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(doc.public_id)}
                                    className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-gray-700 transition-all duration-200"
                                    title="Delete document"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 px-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg border border-gray-700">
                    <div className="mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">No Documents Here</h2>
                    <p className="text-gray-400">Upload your flight tickets, hotel bookings, or visas to get started.</p>
                </div>
            )}

            {/* Modal for document naming */}
            <Modal isOpen={isModalOpen} onClose={handleModalClose} title="Name Your Document">
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="documentName" className="block text-sm font-medium text-gray-700 mb-2">
                            Document Name
                        </label>
                        <Input
                            id="documentName"
                            type="text"
                            value={documentName}
                            onChange={(e) => setDocumentName(e.target.value)}
                            placeholder="Enter a name for your document"
                            required
                        />
                    </div>
                    <div className="flex justify-end space-x-3">
                        <Button type="button" variant="secondary" onClick={handleModalClose}>
                            Cancel
                        </Button>
                        <Button type="submit" isLoading={isUploading}>
                            Upload Document
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
