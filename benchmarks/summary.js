import http from 'k6/http';

export const options = {
  vus: 100,
  duration: "10s",
};

export default function () {
  http.get(`http://localhost:5003/player/summary/${116514945}`);
}
