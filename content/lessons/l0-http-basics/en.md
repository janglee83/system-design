---
id: l0-http-basics
title: "HTTP: the shared language of the web"
---

## Outcome
Read a simple HTTP request and response and say what it wants to do (method), what it targets
(path) and how it went (status code).

## Picture it first
At a post office you fill in a standard form: send or collect, which address, what is inside. The
clerk hands back a standard receipt: "accepted", "address unknown", "we are overloaded today".
Because everyone uses the same forms, any post office understands any customer. **HTTP** is that
shared form between clients and servers on the web.

## Terms
- **HTTP** (HyperText Transfer Protocol): the agreed format for web requests and responses.
- **Method**: the request's verb. `GET` fetches; `POST` submits something new; `PUT` replaces;
  `DELETE` removes.
- **Path**: what you want, for example `/menu/sandwiches`.
- **Headers**: extra lines of information, such as the preferred language or cookies.
- **Body**: the main content, such as an HTML page or the details of an order.
- **Status code**: a number that sums up the result. 2xx means success; 3xx means "look
  elsewhere"; 4xx means the client got something wrong; 5xx means the server had a problem.
- **Stateless**: HTTP does not remember earlier requests. To "remember" something (that you are
  logged in, what is in your cart), the client sends a token such as a **cookie** (a small piece of
  data the browser keeps and sends back), and the server looks the details up in its storage.
- **Safe**: a method that should not change anything on the server (`GET`). **Idempotent**:
  sending it once or twice has the same effect (`GET`, `PUT`, `DELETE`). `POST` is neither:
  sending it twice may create two orders.

## Common misconceptions
- **M1**: "HTTP remembers who I am." It does not; cookies and the server do the remembering.
- **M2**: "404 means the server is broken." 4xx means the request was wrong, for example a bad
  path. A server in trouble answers with 5xx.
- **M3**: "Clicking 'Place order' twice still makes one order." Only if the system was built to be
  idempotent, which you will learn in L3.

## Step 1: observe
A request (our own example):

```
GET /menu/sandwiches HTTP/1.1
Host: your-shop.example
Accept-Language: en
```

And the response:

```
HTTP/1.1 200 OK
Content-Type: text/html

<html>…the sandwich menu…</html>
```

## Step 2: analyse
- The first line of the request has three parts: the method (`GET`), the path and the protocol
  version.
- The first line of the response holds the status code `200` and the phrase `OK`.
- Before sending anything, the client opens a TCP connection, which costs one round trip. If the
  connection is kept open (keep-alive), the next request skips that cost.

## Step 3: apply
In the lab, `writeRatio` splits requests into **reads** (like `GET`) and **writes** (like `POST`,
`PUT` or `DELETE`). Open the companion lab, change `writeRatio` from 0.2 to 0.8 and watch the
breakdown by request type change. This step is not graded.

## Questions
Pass with 4 correct answers out of 5.

- **q1**: What does `DELETE /cart/items/7` ask the server to do?
- **q1.a**: Remove item 7 from the cart.
- **q1.b**: Show item 7.
- **q1.c**: Add 7 more items to the cart.
- **q2**: The server answers `503`. Where is the problem?
- **q2.a**: The client typed a wrong address.
- **q2.b**: Nowhere; the request succeeded.
- **q2.c**: On the server's side, because it is a 5xx code.
- **q3**: The server answers `404` for `/menu/sandwichs`. What most likely happened?
- **q3.a**: The server crashed.
- **q3.b**: The path is misspelt, so the resource does not exist.
- **q3.c**: You must log in first.
- **q4**: On a flaky network, why is resending a `GET` usually fine while resending
  `POST /orders` is risky?
- **q4.a**: `GET` changes nothing and repeating it has the same effect; a repeated `POST` may create
  a second order.
- **q4.b**: `POST` requests are slower than `GET` requests.
- **q4.c**: Servers automatically ignore a repeated `POST`.
- **q5**: HTTP is stateless. How does a site know you are logged in?
- **q5.a**: HTTP keeps every connection open forever, so it remembers you.
- **q5.b**: Your IP address is enough to identify you.
- **q5.c**: The browser sends a cookie holding a session ID, and the server looks that ID up.

## Feedback
- **q3**: A 4xx code says the request itself was wrong; here a letter is missing from the path.
  The server is healthy: it understood the request well enough to say "no such page". A broken
  server would answer with a 5xx code.
- **q4**: Servers do not ignore repeats on their own. A `GET` only reads, so doing it twice is
  harmless; a `POST` creates something, so doing it twice can create two orders unless the system
  is deliberately built to spot the duplicate.
- **q5**: HTTP forgets each request as soon as it has answered it. The memory lives in a cookie
  that the browser sends with every request, plus the session data the server keeps. Connections
  close and IP addresses are shared or change, so neither can identify you.

## Takeaways
- An HTTP request is method + path + headers (+ body); a response is status + headers (+ body).
- 4xx: the client was wrong. 5xx: the server had trouble.
- HTTP forgets; cookies and servers remember.

## Review questions
1. Name four HTTP methods and what each one does.
2. What does the 3xx group of status codes mean?
3. What does "idempotent" mean? Give an idempotent method.
