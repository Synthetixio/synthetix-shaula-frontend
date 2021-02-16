import fetch from 'unfetch';
import qs from 'query-string';

export async function get(url, query) {
  if (query) {
    url += '?' + qs.stringify(query);
  }
  return await (await fetch(url)).json();
}
