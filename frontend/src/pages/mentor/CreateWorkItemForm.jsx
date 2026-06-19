// src/pages/mentor/CreateWorkItemForm.jsx
// Form for creating an Assignment, Task, or Project for a specific intern.
// Used inside a Modal on InternDetail.jsx.

import { useState } from 'react';
import * as mentorApi from '../../api/mentor.api';

const SUBMISSION_FORMATS = [
  { value: 'any',    label: 'Any format' },
  { value: 'pdf',    label: 'PDF only' },
  { value: 'gdrive', label: 'Google Drive link' },
  { value: 'github', label: 'GitHub link' },
  { value: 'files',  label: 'Code files' },
];

export default function CreateWorkItemForm({ internId, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('task');
  const [deadline, setDeadline] = useState('');
  const [submissionFormat, setSubmissionFormat] = useState('any');
  const [allowDeadlineExtension, setAllowDeadlineExtension] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !description.trim() || !deadline) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      await mentorApi.createWorkItem({
        title: title.trim(),
        description: description.trim(),
        type,
        internId,
        deadline: new Date(deadline).toISOString(),
        submissionFormat,
        allowDeadlineExtension,
      });
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create work item.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Type</label>
        <div className="grid grid-cols-3 gap-2">
          {['assignment', 'task', 'project'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                type === t ? 'bg-accent-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input-field"
          placeholder="e.g. Set up Docker container"
        />
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="input-field"
          placeholder="What does the intern need to do?"
        />
      </div>

      <div>
        <label className="label">Deadline</label>
        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="input-field"
        />
      </div>

      <div>
        <label className="label">Submission format</label>
        <select
          value={submissionFormat}
          onChange={(e) => setSubmissionFormat(e.target.value)}
          className="input-field"
        >
          {SUBMISSION_FORMATS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={allowDeadlineExtension}
          onChange={(e) => setAllowDeadlineExtension(e.target.checked)}
          className="rounded border-gray-300 text-accent-600 focus:ring-accent-500"
        />
        Allow deadline modification later
      </label>

      {error && (
        <p className="text-sm text-danger-600 flex items-center gap-1.5">
          <i className="ti ti-alert-circle" aria-hidden="true" />
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Creating...' : `Create ${type}`}
      </button>
    </form>
  );
}
