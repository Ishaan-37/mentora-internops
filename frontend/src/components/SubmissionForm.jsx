// src/components/SubmissionForm.jsx
// Renders different fields depending on selected submission type:
// PDF upload, Google Drive link, GitHub link, file upload, or other (text only).

import { useState } from 'react';
import * as internApi from '../api/intern.api';

const SUBMISSION_TYPES = [
  { value: 'pdf',    label: 'Upload PDF' },
  { value: 'gdrive',  label: 'Google Drive link' },
  { value: 'github',  label: 'GitHub link' },
  { value: 'files',   label: 'Upload files (.zip, .py, .js...)' },
  { value: 'other',   label: 'Other' },
];

export default function SubmissionForm({ workItemId, onSuccess }) {
  const [submissionType, setSubmissionType] = useState('pdf');
  const [file, setFile] = useState(null);
  const [externalLink, setExternalLink] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB.');
      return;
    }
    setError('');
    setFile(selected);
  };

  const validate = () => {
    if (['pdf', 'files'].includes(submissionType) && !file) {
      return 'Please choose a file to upload.';
    }
    if (['gdrive', 'github'].includes(submissionType)) {
      if (!externalLink.trim()) return 'Please enter a link.';
      if (!/^https:\/\//.test(externalLink.trim())) return 'Link must start with https://';
    }
    if (submissionType === 'other' && !notes.trim()) {
      return 'Please describe your submission.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await internApi.submitWork({
        workItemId,
        submissionType,
        externalLink: externalLink.trim() || undefined,
        notes: notes.trim() || undefined,
        file,
      });
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="label">Submission type</label>
        <select
          value={submissionType}
          onChange={(e) => { setSubmissionType(e.target.value); setError(''); }}
          className="input-field"
        >
          {SUBMISSION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {submissionType === 'pdf' && (
        <div>
          <label className="label">Choose PDF file</label>
          <input type="file" accept=".pdf" onChange={handleFileChange} className="input-field" />
        </div>
      )}

      {submissionType === 'files' && (
        <div>
          <label className="label">Choose file</label>
          <input
            type="file"
            accept=".zip,.py,.js,.ts,.jsx,.tsx,.txt,.java,.cpp,.c,.go,.json,.yml,.yaml,.md"
            onChange={handleFileChange}
            className="input-field"
          />
        </div>
      )}

      {submissionType === 'gdrive' && (
        <div>
          <label className="label">Google Drive link</label>
          <input
            type="url"
            value={externalLink}
            onChange={(e) => setExternalLink(e.target.value)}
            placeholder="https://drive.google.com/..."
            className="input-field"
          />
          <p className="text-xs text-warning-700 mt-1.5 flex items-center gap-1">
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            Make sure the link is shared publicly or with your mentor.
          </p>
        </div>
      )}

      {submissionType === 'github' && (
        <div>
          <label className="label">GitHub repository link</label>
          <input
            type="url"
            value={externalLink}
            onChange={(e) => setExternalLink(e.target.value)}
            placeholder="https://github.com/username/repo"
            className="input-field"
          />
        </div>
      )}

      {submissionType === 'other' && (
        <div>
          <label className="label">Describe your submission</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="input-field"
            placeholder="Explain what you're submitting and how to access it..."
          />
        </div>
      )}

      {submissionType !== 'other' && (
        <div>
          <label className="label">Notes for mentor (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="input-field"
            placeholder="Any extra context for your mentor..."
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-danger-600 flex items-center gap-1.5">
          <i className="ti ti-alert-circle" aria-hidden="true" />
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Submitting...' : 'Submit work'}
      </button>
    </form>
  );
}
