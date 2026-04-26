import { useState, useEffect } from 'react';
import { referencesService } from '../services';

/** Fetch references by type */
export function useReferences(type) {
  const [references, setReferences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRefs = async () => {
    if (!type) {
      setReferences([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await referencesService.getByType(type);
      setReferences(data);
    } catch (err) {
      setError(err);
      setReferences([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefs();
  }, [type]);

  return { references, loading, error, refetch: fetchRefs };
}
