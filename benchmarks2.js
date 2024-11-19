import http from 'k6/http';
import { sleep } from 'k6';


export const options = {
  vus: 100,
  duration: '100s'
};

export default function () {
  http.get('http://localhost:5003/match/all?page=0&per_page=25')

  sleep(1);
}
