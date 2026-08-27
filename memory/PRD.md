# PRD — L'Atelier des parfums (Live Shopping Checkout)

## Problem statement (original)
"Je veux que tu me crée une base que je vais t'envoyer pareil avec mon logo nom de la boutique tu met L'Atelier des parfums je veux un compte admin après pour recevoir les commande ect" + captures BuyLive (checkout live shopping : montant, référence, pseudo, coordonnées, livraison Chronopost, résumé, paiement CB).
Choix utilisateur : formulaire complet type BuyLive, paiement réel Stripe, notifications dans le dashboard admin uniquement, champ libre référence + montant, livraison Mondial Relay + Stripe, compte admin pour voir commandes et paiements.

## Architecture
- Frontend : React 19, Tailwind, Framer Motion (reveals), Lenis (smooth scroll), Sonner (toasts). Design noir & or basé sur le logo fourni (hero plein écran avec logo, reveal masqué ligne par ligne, marquee éditorial, chapitres numérotés 01-03, formulaire crème type BuyLive).
- Backend : FastAPI + MongoDB (motor). Routes /api/* : auth JWT (cookies httpOnly + Bearer), orders, payments Stripe (checkout sessions dynamiques en EUR), webhook /api/stripe/webhook, admin (orders, stats, PATCH statut).
- Paiement : Stripe sandbox claimable (Flow A), tax_mode = calc_only (produits physiques — Stripe calcule la TVA, le marchand déclare). Fallback sans automatic_tax si non activé.

## User personas
- Cliente du live (TikTok/Insta) : règle sa commande avec montant + référence annoncés au live.
- Admin (boutique) : suit commandes, statuts payé/en attente, export CSV.

## Implémenté (27/08/2026, session 3)
- Site vitrine complet : Accueil (hero + aperçu collection + teaser histoire + CTA), /catalogue, /histoire, /contact (formulaire → messages visibles dans l'admin), /faq (livraison/retours), /commande (checkout, pré-rempli via ?ref=&montant= depuis le catalogue). Navigation partagée (SiteChrome).
- Catalogue 100% géré par l'admin : GET /api/products public, POST/DELETE /api/admin/products. Section "Mes parfums" dans le dashboard (nom, référence, prix, contenance, notes, URL photo, description). AUCUN produit d'exemple — catalogue vide, la cliente ajoute les siens.
- Tarifs livraison réels : Mondial Relay 4,99 €, Chronopost Relais 5,99 €, Chronopost Domicile 9,90 € (frontend + backend + FAQ).

## Implémenté (27/08/2026, session 2)
- Regroupement de commandes : si l'e-mail a une commande payée/en attente (< 7 jours) avec livraison, option "Ajouter à mon colis en cours — port offert" à l'étape 2 (GET /api/orders/group-eligibility, shipping_method "groupage", group_id lie à la commande de base, badge "Groupé" dans l'admin).
- Mondial Relay : recherche de points relais (WSI4 SOAP) dans le checkout, génération d'étiquette PDF depuis l'admin (WSI2_CreationEtiquette, bouton "Générer étiquette" sur commandes payées Mondial Relay, n° de suivi + lien PDF stockés sur la commande). Identifiants de test officiels BDTEST13/TestAPI1key en env.
- BLOCAGE : le compte de test public BDTEST13 renvoie STAT 95 "Compte Enseigne non activé" (désactivé côté Mondial Relay — vérifié, le hash est correct car pas d'erreur 97). En attente des vrais identifiants marchands (Code Enseigne + Clé Privée) à mettre dans backend/.env (MR_ENSEIGNE / MR_PRIVATE_KEY + adresse expéditeur MR_SENDER_*).
- Fallback checkout : si la recherche de relais échoue, champ manuel "Point Relais préféré" (relay_id=MANUEL, étiquette non générable pour ceux-là).

## Implémenté (27/08/2026)
- Page publique : hero noir & or avec logo, marquee, chapitres, formulaire 3 étapes (montant/référence/pseudo/coordonnées → livraison Chronopost Relais 4,90 € / Chronopost Domicile 8,90 € / Mondial Relay 3,90 € → récap + CGV + bouton paiement).
- Stripe : commande créée en BDD → session Checkout Stripe (montant serveur, EUR) → redirect → page succès avec polling de confirmation → webhook + fallback poll marquent la commande "paid".
- Admin : login (admin@atelier-parfums.fr / Atelier2026!), dashboard KPIs (CA payé, payées, en attente, panier moyen), table commandes dépliable (contact, adresse, montants), "Marquer payée", export CSV, déconnexion.
- Sécurité : bcrypt, JWT, anti brute-force (5 essais / 15 min), montants calculés côté serveur.
- Données d'exemple : 3 commandes seed (1 payée, 2 en attente).

## Backlog
- P0 : Intégration API Mondial Relay réelle (sélecteur de point relais) — nécessite identifiants marchand Mondial Relay (code enseigne + clé privée). Actuellement : choix du transporteur avec tarif fixe.
- P0 : Réclamer le sandbox Stripe (onboarding_url) + KYC avant mise en production.
- P1 : Notification email admin à chaque commande payée (Resend géré).
- P1 : Page CGV / Politique de confidentialité réelles.
- P2 : Catalogue produits avec photos géré depuis l'admin.
- P2 : Remboursements depuis le dashboard, relance paiement par email (lien Stripe).
- P2 : Personnaliser tarifs/délais livraison depuis l'admin.

## Next tasks
1. Réclamer le compte Stripe (lien onboarding) puis passer en live.
2. Fournir identifiants Mondial Relay pour le vrai sélecteur de points relais.
3. Activer Stripe Tax dans le Dashboard Stripe (tax_mode calc_only).
4. Option : emails de confirmation client + notification admin (Resend).
