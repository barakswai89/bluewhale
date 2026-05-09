// FILE: server/src/routes/companies.routes.ts
import { Router } from 'express';
import { CompaniesController, getLiveStats, getCompanyNews } from '../controllers/companies.controller';

const router = Router();
const companiesController = new CompaniesController();

router.get('/',                                    (req, res) => companiesController.getAll(req, res));
router.get('/search',                              (req, res) => companiesController.search(req, res));
// Live endpoints — must be declared before /ticker/:ticker to avoid param collision
router.get('/ticker/:ticker/live',                 getLiveStats);
router.get('/ticker/:ticker/news',                 getCompanyNews);
router.get('/ticker/:ticker',                      (req, res) => companiesController.getByTicker(req, res));
router.get('/:id',                                 (req, res) => companiesController.getById(req, res));

export default router;
