---
id: l0-client-server
title: "Who asks, who answers: client and server"
---

## Outcome
By the end you can show that every request needs a running server at the end of its path, and
explain why boxes in the middle, or a browser on its own, never answer anyone.

## Picture it first
You are at a sandwich stall. You say "one chicken sandwich". The vendor hears you, makes it and
hands it over. Two clear roles: the one who **asks** and the one who **answers**. Talk to the
glass display or to the security guard at the door, and no sandwich appears however loudly you
order.

## Terms
- **Client**: a program that sends requests — a browser, a phone app. In the lab, one `client`
  block stands for many users at once.
- **Server**: a program that waits for requests and sends back answers. Client and server are
  **roles**, not kinds of machine: a web server becomes a client when it asks a database.
- **Request**: one question. **Response**: the answer to it.
- **Load balancer** (`lb` block): a middleman that hands requests to servers behind it. You will
  study it in L1; today you only need to know it **does not answer by itself**.
- **Availability**: the share of requests that got a successful answer.

## Common misconceptions
- **M1**: "Any box in the middle of the Internet will answer me." A middle box forwards; something
  behind it must answer.
- **M2**: "Once a server is switched on, users find it on their own." There must be a path
  (address and connection) from client to server.
- **M3**: "The website already lives in my browser." The browser shows what a server sent.

## Experiment
**Setup:** users send 500 requests per second. They reach a load balancer (`lb`), and behind it
sits one web server (`web`). You have two switches:

- **Web server**: running for the whole run, or switched off from the very first second.
- **Load balancer copies**: 1 or 2.

**Predict before you run:** the web server is off, but you now have two load balancers. What share
of requests gets an answer: 0%, 50% or 100%? *(0%.)*

**Goals:** availability of at least 99%, and no request "unreachable" (a request is unreachable
when there is nobody left on its path who can answer it).

| Choice | Web server | LB copies | What the lab shows |
|---|---|---|---|
| A | running | 1 | availability 100%, p95 about 7 ms |
| B | off | 2 | availability 0%, every request unreachable |
| C | off | 1 | availability 0%, every request unreachable |

Open **Follow request** on choice A: each request goes users → `lb` → `web` and the answer comes
back the same way. On B and C the trail stops at `lb`.

## Feedback
- **B**: A second load balancer is a second middleman, not a second cook. Both of them accept
  requests and look for a server to pass them to, find nobody, and the request falls into the gap.
  Adding boxes in the middle never creates an answer.
- **C**: The browser does not hold the website; it only shows what a server sends back. With the
  web server off there is nothing to send, so every user gets nothing, no matter what is installed
  on their side.
- **M2**: A server that is switched on but has no connection from the users is invisible to them.
  In real life that is a missing address or a blocked connection. In the lab, try deleting the edge
  from users to `lb`: the lab refuses to run at all and reports `client.no-path`, because no request
  could ever reach anyone.

## Takeaways
- Every use of the web is a question-and-answer pair between a client and a server.
- Client and server are roles; one program can play both.
- Boxes in the middle forward; a real server must still answer.

## Review questions
1. When a web server queries a database, which role is the web server playing? *(Client.)*
2. Why does wiring users to an empty load balancer give 0% availability? *(It has nobody to forward
   to; it does not answer on its own.)*
3. Name two everyday clients. *(A browser, a banking app, a script that downloads data…)*
4. With 10,000 requests, what does 99% availability mean? *(About 9,900 got a successful answer.)*
